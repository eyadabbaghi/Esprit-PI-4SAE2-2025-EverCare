import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { combineLatest, forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AssessmentReport,
  AssessmentStageFilter,
  ClinicalAlert,
  ClinicalAlertStatus
} from '../../models/assessment.model';
import { AssessmentService } from '../../services/assessment.service';
import { MedicalRecordService } from '../../services/medical-record.service';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { resolveRole } from '../../utils/medical-record-permissions';

interface AlzheimerAssessmentResult {
  userId: string;
  completedAt: string;
  diagnosis?: { predicted: number; probability: number; label: string };
  severity?: {
    mmseEstimate?: number;
    stage?: string;
    severityLevel?: string;
    mmseRange?: string;
  };
  riskAssessment?: {
    score?: number;
    level?: string;
    riskFactors?: string[];
  };
  recommendations?: {
    path?: string;
    title?: string;
    description?: string;
    medications?: string[];
    lifestyle?: string[];
    monitoring?: string[];
    support?: string[];
    actions?: string[];
  };
}

interface AlzheimerAssessmentView {
  id: string;
  patientId: string;
  patientName: string;
  completedAt: string;
  diagnosisLabel: string;
  diagnosisProbability: number | null;
  stageOrRisk: string;
  recommendationTitle: string;
  result: AlzheimerAssessmentResult;
}

@Component({
  selector: 'app-doctor-reports-list',
  templateUrl: './doctor-reports-list.component.html',
  styleUrl: './doctor-reports-list.component.css'
})
export class DoctorReportsListComponent implements OnInit {
  readonly stageControl = new FormControl<AssessmentStageFilter>('', { nonNullable: true });
  readonly queryControl = new FormControl('', { nonNullable: true });
  readonly fromDateControl = new FormControl('', { nonNullable: true });
  readonly toDateControl = new FormControl('', { nonNullable: true });

  reports: AssessmentReport[] = [];
  alzheimerReports: AlzheimerAssessmentView[] = [];
  selectedAlzheimerReport: AlzheimerAssessmentView | null = null;
  patientFilterProfile: User | null = null;
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  alertsOnly = false;
  isLoading = false;
  errorMessage = '';
  actionMessage = '';
  patientFilterId = '';
  acknowledgingReportId: string | null = null;
  resolvingReportId: string | null = null;
  private alertByReportId: Record<string, { id: string; status: ClinicalAlertStatus }> = {};
  private loadRequestToken = 0;
  private currentUser: User | null = null;
  private currentRole: string | undefined;
  private associatedPatients: User[] = [];
  private associatedPatientIds = new Set<string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly assessmentService: AssessmentService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly authService: AuthService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.errorMessage = 'Loading reports in the browser...';
      return;
    }

    combineLatest([this.authService.currentUser$, this.route.queryParamMap]).subscribe(([user, params]) => {
      if (!user) {
        return;
      }
      this.currentUser = user;
      this.currentRole = resolveRole(user.role);
      this.patientFilterId = (params.get('patientId') ?? '').trim();
      if (this.patientFilterId) {
        this.alertsOnly = false;
      }

      if (this.isCareTeamRole()) {
        this.loadAssociatedPatients().subscribe({
          next: (patients) => {
            this.associatedPatients = patients;
            this.rebuildAssociatedPatientIds();
            this.resolvePatientFilterProfile();
            this.loadPage(0);
          },
          error: () => {
            this.associatedPatients = [];
            this.associatedPatientIds.clear();
            this.reports = [];
            this.totalElements = 0;
            this.totalPages = 0;
            this.errorMessage = 'Unable to load associated patients.';
          }
        });
        return;
      }

      this.associatedPatients = [];
      this.associatedPatientIds.clear();
      this.resolvePatientFilterProfile();
      this.loadPage(0);
    });
  }

  applyFilters(): void {
    if (this.isPatientFiltered) {
      return;
    }
    this.loadPage(0);
  }

  toggleAlertsOnly(): void {
    if (this.isPatientFiltered) {
      return;
    }
    this.alertsOnly = !this.alertsOnly;
    this.loadPage(0);
  }

  previousPage(): void {
    if (this.page <= 0 || this.isPatientFiltered) {
      return;
    }
    this.loadPage(this.page - 1);
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages || this.isPatientFiltered) {
      return;
    }
    this.loadPage(this.page + 1);
  }

  openReport(reportId: string): void {
    this.router.navigate(['/assessment/report', reportId]);
  }

  openPatientDossier(patientId: string): void {
    const candidates = this.getPatientLookupCandidates(patientId);
    this.openPatientDossierByCandidate(candidates, 0);
  }

  private openPatientDossierByCandidate(candidates: string[], index: number): void {
    if (index >= candidates.length) {
      this.errorMessage = 'Patient medical record not found.';
      return;
    }

    this.medicalRecordService.getByPatientId(candidates[index]).subscribe({
      next: (record) => {
        this.router.navigate(['/medical-record', record.id]);
      },
      error: () => {
        this.openPatientDossierByCandidate(candidates, index + 1);
      }
    });
  }

  clearPatientFilter(): void {
    this.router.navigate(['/doctor/reports']);
  }

  getPatientFilterName(): string {
    return this.patientFilterProfile?.name?.trim()
      || this.patientFilterProfile?.email?.trim()
      || 'Selected patient';
  }

  getPatientFilterInitials(): string {
    const name = this.getPatientFilterName();
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'P';
  }

  get isPatientFiltered(): boolean {
    return !!this.patientFilterId;
  }

  getAlertStatus(report: AssessmentReport): ClinicalAlertStatus | null {
    return this.alertByReportId[report.id]?.status ?? null;
  }

  canAcknowledgeAlert(report: AssessmentReport): boolean {
    const status = this.getAlertStatus(report);
    return report.needsAttention && (status === null || status === 'OPEN');
  }

  canResolveAlert(report: AssessmentReport): boolean {
    const status = this.getAlertStatus(report);
    return report.needsAttention && (status === null || status === 'OPEN' || status === 'ACK');
  }

  acknowledgeAlert(report: AssessmentReport): void {
    if (this.acknowledgingReportId || this.resolvingReportId) {
      return;
    }

    this.errorMessage = '';
    this.actionMessage = '';
    this.acknowledgingReportId = report.id;
    this.withAlertId(report, (alertId) => {
      this.assessmentService.acknowledgeAlert(alertId).subscribe({
        next: (alert) => {
          this.alertByReportId[report.id] = { id: alert.id, status: alert.status };
          this.acknowledgingReportId = null;
          this.actionMessage = 'Alert acknowledged successfully.';
        },
        error: (error: HttpErrorResponse) => {
          this.acknowledgingReportId = null;
          this.errorMessage = this.extractError(error, 'Unable to acknowledge the alert.');
        }
      });
    });
  }

  resolveAlert(report: AssessmentReport): void {
    if (this.resolvingReportId || this.acknowledgingReportId) {
      return;
    }

    this.errorMessage = '';
    this.actionMessage = '';
    this.resolvingReportId = report.id;
    this.withAlertId(report, (alertId) => {
      this.assessmentService.resolveAlert(alertId).subscribe({
        next: () => {
          delete this.alertByReportId[report.id];
          this.reports = this.reports.map((current) =>
            current.id === report.id ? { ...current, needsAttention: false } : current
          );
          if (this.alertsOnly && !this.isPatientFiltered) {
            this.reports = this.reports.filter((current) => current.id !== report.id);
            this.totalElements = Math.max(0, this.totalElements - 1);
          }
          this.resolvingReportId = null;
          this.actionMessage = 'Alert resolved successfully.';
        },
        error: (error: HttpErrorResponse) => {
          this.resolvingReportId = null;
          this.errorMessage = this.extractError(error, "Unable to resolve the alert.");
        }
      });
    });
  }

  private loadPage(page: number): void {
    const token = ++this.loadRequestToken;
    this.isLoading = true;
    this.errorMessage = '';
    this.actionMessage = '';
    this.reports = [];
    this.alzheimerReports = [];
    this.selectedAlzheimerReport = null;
    this.alertByReportId = {};

    if (this.isPatientFiltered) {
      if (this.isCareTeamRole() && !this.isAssociatedPatientIdentifier(this.patientFilterId)) {
        this.reports = [];
        this.totalElements = 0;
        this.totalPages = 0;
        this.errorMessage = 'You can only view reports for your associated patients.';
        this.isLoading = false;
        return;
      }

      forkJoin({
        medical: this.loadReportsForPatientIdentifier(this.patientFilterId),
        alzheimer: this.loadAlzheimerReportsForPatientIdentifier(this.patientFilterId)
      }).subscribe({
        next: ({ medical, alzheimer }) => {
          if (token !== this.loadRequestToken) {
            return;
          }
          this.reports = [...medical].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.alzheimerReports = alzheimer;
          this.syncAlertActions();
          this.page = 0;
          this.totalElements = this.reports.length + this.alzheimerReports.length;
          this.totalPages = 1;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          if (token !== this.loadRequestToken) {
            return;
          }
          this.errorMessage = this.extractError(error, 'Failed to load reports for this patient.');
          this.totalElements = 0;
          this.totalPages = 0;
          this.isLoading = false;
        }
      });
      return;
    }

    if (this.isCareTeamRole()) {
      forkJoin({
        medical: this.loadAssociatedReports(),
        alzheimer: this.loadAssociatedAlzheimerReports()
      }).subscribe({
        next: ({ medical, alzheimer }) => {
          if (token !== this.loadRequestToken) {
            return;
          }

          this.reports = this.applyLocalFilters(medical);
          this.alzheimerReports = this.applyAlzheimerLocalFilters(alzheimer);
          this.syncAlertActions();
          this.page = 0;
          this.totalElements = this.reports.length + this.alzheimerReports.length;
          this.totalPages = this.totalElements > 0 ? 1 : 0;
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          if (token !== this.loadRequestToken) {
            return;
          }
          this.errorMessage = this.extractError(error, 'Failed to load associated patient reports.');
          this.totalElements = 0;
          this.totalPages = 0;
          this.isLoading = false;
        }
      });
      return;
    }

    const stage = this.stageControl.value;
    const query = this.queryControl.value;
    const fromDate = this.fromDateControl.value;
    const toDate = this.toDateControl.value;

    const request$ = this.alertsOnly
      ? this.assessmentService.getAlerts(page, this.size)
      : this.assessmentService.getPage(page, this.size, stage, fromDate, toDate, query);

    request$.subscribe({
      next: (response) => {
        if (token !== this.loadRequestToken) {
          return;
        }
        this.reports = response.content;
        this.syncAlertActions();
        this.page = response.number;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (token !== this.loadRequestToken) {
          return;
        }
        this.errorMessage = this.extractError(error, 'Failed to load reports.');
        this.isLoading = false;
      }
    });
  }

  private syncAlertActions(): void {
    this.alertByReportId = {};
    if (this.reports.length === 0) {
      return;
    }

    this.assessmentService.getClinicalAlerts(0, 200).subscribe({
      next: (pageResponse) => {
        const reportIds = new Set(this.reports.map((report) => report.id));
        const relevantAlerts = pageResponse.content
          .filter((alert) => reportIds.has(alert.assessmentReportId) && alert.status !== 'RESOLVED')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const mapping: Record<string, { id: string; status: ClinicalAlertStatus }> = {};
        for (const alert of relevantAlerts) {
          if (!mapping[alert.assessmentReportId]) {
            mapping[alert.assessmentReportId] = { id: alert.id, status: alert.status };
          }
        }

        this.alertByReportId = mapping;
      },
      error: () => {
        this.alertByReportId = {};
      }
    });
  }

  private withAlertId(report: AssessmentReport, onReady: (alertId: string) => void): void {
    const existing = this.alertByReportId[report.id];
    if (existing) {
      onReady(existing.id);
      return;
    }

    this.assessmentService.getOrCreateAlertFromReport(report.id).subscribe({
      next: (alert: ClinicalAlert) => {
        this.alertByReportId[report.id] = { id: alert.id, status: alert.status };
        onReady(alert.id);
      },
      error: (error: HttpErrorResponse) => {
        this.acknowledgingReportId = null;
        this.resolvingReportId = null;
        this.errorMessage = this.extractError(error, 'Unable to initialize the alert for this report.');
      }
    });
  }

  private extractError(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }

  private isCareTeamRole(): boolean {
    return this.currentRole === 'DOCTOR' || this.currentRole === 'CAREGIVER';
  }

  private loadAssociatedPatients(): Observable<User[]> {
    const currentEmail = String(this.currentUser?.email || '').trim().toLowerCase();
    const directEmails = this.normalizeEmailList(this.currentUser?.patientEmails || []);
    const directRequests = directEmails.map((email) =>
      this.authService.getUserByEmail(email).pipe(catchError(() => of(null)))
    );

    const direct$ = directRequests.length > 0 ? forkJoin(directRequests) : of([]);
    const fallback$ = this.authService.searchUsersByRole('', 'PATIENT').pipe(catchError(() => of([])));

    return forkJoin({ direct: direct$, fallback: fallback$ }).pipe(
      map(({ direct, fallback }) => {
        const associated = new Map<string, User>();

        for (const patient of direct) {
          if (patient) {
            associated.set(this.patientAssociationKey(patient), patient);
          }
        }

        for (const patient of fallback || []) {
          if (this.isAssociatedPatientUser(patient, currentEmail)) {
            associated.set(this.patientAssociationKey(patient), patient);
          }
        }

        return Array.from(associated.values());
      })
    );
  }

  private loadAssociatedReports(): Observable<AssessmentReport[]> {
    const reportRequests = this.associatedPatients.map((patient) => this.loadReportsForPatient(patient));
    if (reportRequests.length === 0) {
      return of([]);
    }

    return forkJoin(reportRequests).pipe(
      map((groups) => groups.flat()),
      map((reports) => this.uniqueReports(reports).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    );
  }

  private loadReportsForPatient(patient: User): Observable<AssessmentReport[]> {
    const candidates = this.resolvePatientCandidates(patient);
    const requests = candidates.map((candidate) =>
      this.assessmentService.getByPatient(candidate).pipe(catchError(() => of([] as AssessmentReport[])))
    );
    return requests.length > 0 ? forkJoin(requests).pipe(map((groups) => groups.flat())) : of([]);
  }

  private loadReportsForPatientIdentifier(patientId: string): Observable<AssessmentReport[]> {
    const candidates = this.getPatientLookupCandidates(patientId);
    const requests = candidates.map((candidate) =>
      this.assessmentService.getByPatient(candidate).pipe(catchError(() => of([] as AssessmentReport[])))
    );
    return requests.length > 0 ? forkJoin(requests).pipe(map((groups) => this.uniqueReports(groups.flat()))) : of([]);
  }

  private loadAssociatedAlzheimerReports(): Observable<AlzheimerAssessmentView[]> {
    const reportRequests = this.associatedPatients.map((patient) => this.loadAlzheimerReportsForPatient(patient));
    if (reportRequests.length === 0) {
      return of([]);
    }

    return forkJoin(reportRequests).pipe(
      map((groups) => groups.flat()),
      map((reports) => this.uniqueAlzheimerReports(reports).sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ))
    );
  }

  private loadAlzheimerReportsForPatientIdentifier(patientId: string): Observable<AlzheimerAssessmentView[]> {
    const normalized = patientId.trim().toLowerCase();
    const patient = this.associatedPatients.find((candidate) =>
      this.resolvePatientCandidates(candidate).some((value) => value.toLowerCase() === normalized)
    );

    if (patient) {
      return this.loadAlzheimerReportsForPatient(patient);
    }

    const fallbackPatient = {
      userId: patientId,
      email: patientId,
      name: patientId,
      role: 'PATIENT'
    } as User;
    return this.loadAlzheimerReportsForPatient(fallbackPatient);
  }

  private loadAlzheimerReportsForPatient(patient: User): Observable<AlzheimerAssessmentView[]> {
    const candidates = this.resolvePatientCandidates(patient);
    const requests = candidates.map((candidate) =>
      this.authService.getPatientAlzheimerAssessment<AlzheimerAssessmentResult>(candidate).pipe(
        map((result) => result ? [this.toAlzheimerAssessmentView(result, patient, candidate)] : []),
        catchError(() => of([] as AlzheimerAssessmentView[]))
      )
    );

    return requests.length > 0
      ? forkJoin(requests).pipe(map((groups) => this.uniqueAlzheimerReports(groups.flat())))
      : of([]);
  }

  private applyLocalFilters(reports: AssessmentReport[]): AssessmentReport[] {
    const stage = this.stageControl.value;
    const query = this.queryControl.value.trim().toLowerCase();
    const fromDate = this.fromDateControl.value;
    const toDate = this.toDateControl.value;

    return reports.filter((report) => {
      if (this.alertsOnly && !report.needsAttention) return false;
      if (stage && report.computedStage !== stage) return false;
      if (query) {
        const label = `${report.patientName || ''} ${report.patientId || ''}`.toLowerCase();
        if (!label.includes(query)) return false;
      }
      const createdDay = report.createdAt?.slice(0, 10) || '';
      if (fromDate && createdDay < fromDate) return false;
      if (toDate && createdDay > toDate) return false;
      return true;
    });
  }

  private applyAlzheimerLocalFilters(reports: AlzheimerAssessmentView[]): AlzheimerAssessmentView[] {
    const query = this.queryControl.value.trim().toLowerCase();
    const fromDate = this.fromDateControl.value;
    const toDate = this.toDateControl.value;

    return reports.filter((report) => {
      if (this.alertsOnly) return false;
      if (this.stageControl.value) return false;
      if (query) {
        const label = `${report.patientName || ''} ${report.patientId || ''}`.toLowerCase();
        if (!label.includes(query)) return false;
      }
      const createdDay = report.completedAt?.slice(0, 10) || '';
      if (fromDate && createdDay < fromDate) return false;
      if (toDate && createdDay > toDate) return false;
      return true;
    });
  }

  private rebuildAssociatedPatientIds(): void {
    this.associatedPatientIds = new Set(
      this.associatedPatients.flatMap((patient) => this.resolvePatientCandidates(patient).map((value) => value.toLowerCase()))
    );

    this.normalizeEmailList(this.currentUser?.patientEmails || []).forEach((email) => {
      this.associatedPatientIds.add(email.toLowerCase());
    });
  }

  private isAssociatedPatientIdentifier(patientId: string): boolean {
    const normalized = patientId.trim().toLowerCase();
    return !!normalized && this.associatedPatientIds.has(normalized);
  }

  private getPatientLookupCandidates(patientId: string): string[] {
    const normalized = patientId.trim().toLowerCase();
    const patient = this.associatedPatients.find((candidate) =>
      this.resolvePatientCandidates(candidate).some((value) => value.toLowerCase() === normalized)
    );

    return patient ? this.resolvePatientCandidates(patient) : this.uniqueNormalized([patientId]);
  }

  private resolvePatientFilterProfile(): void {
    if (!this.patientFilterId) {
      this.patientFilterProfile = null;
      return;
    }

    const normalized = this.patientFilterId.trim().toLowerCase();
    this.patientFilterProfile = this.associatedPatients.find((patient) =>
      this.resolvePatientCandidates(patient).some((candidate) => candidate.toLowerCase() === normalized)
    ) || null;
  }

  openAlzheimerReport(report: AlzheimerAssessmentView): void {
    this.selectedAlzheimerReport = report;
  }

  closeAlzheimerReport(): void {
    this.selectedAlzheimerReport = null;
  }

  getAlzheimerRecommendationItems(report: AlzheimerAssessmentView): string[] {
    const recommendations = report.result.recommendations;
    return [
      ...(recommendations?.actions || []),
      ...(recommendations?.monitoring || []),
      ...(recommendations?.lifestyle || []),
      ...(recommendations?.support || []),
      ...(recommendations?.medications || [])
    ].filter(Boolean);
  }

  private isAssociatedPatientUser(patient: User, currentEmail: string): boolean {
    if (!currentEmail) {
      return false;
    }

    const directEmails = this.normalizeEmailList(this.currentUser?.patientEmails || []);
    const patientCandidates = this.resolvePatientCandidates(patient).map((candidate) => candidate.toLowerCase());
    if (directEmails.some((email) => patientCandidates.includes(email.toLowerCase()))) {
      return true;
    }

    if (this.currentRole === 'DOCTOR') {
      return this.normalizeEmailList([
        patient.doctorEmail || '',
        ...(patient.doctorEmails || [])
      ]).includes(currentEmail);
    }

    const caregiverEmails = this.normalizeEmailList(patient.caregiverEmails || []);
    return caregiverEmails.some((email) => email.toLowerCase() === currentEmail);
  }

  private resolvePatientCandidates(patient: User): string[] {
    return this.uniqueNormalized([
      patient.userId || '',
      patient.keycloakId || '',
      patient.email || '',
      patient.name || ''
    ]);
  }

  private patientAssociationKey(patient: User): string {
    return (patient.userId || patient.email || patient.name || '').trim().toLowerCase();
  }

  private uniqueReports(reports: AssessmentReport[]): AssessmentReport[] {
    const seen = new Set<string>();
    return reports.filter((report) => {
      if (!report?.id || seen.has(report.id)) {
        return false;
      }
      seen.add(report.id);
      return true;
    });
  }

  private uniqueAlzheimerReports(reports: AlzheimerAssessmentView[]): AlzheimerAssessmentView[] {
    const seen = new Set<string>();
    return reports.filter((report) => {
      if (!report?.id || seen.has(report.id)) {
        return false;
      }
      seen.add(report.id);
      return true;
    });
  }

  private toAlzheimerAssessmentView(
    result: AlzheimerAssessmentResult,
    patient: User,
    candidate: string
  ): AlzheimerAssessmentView {
    const patientId = result.userId || patient.userId || candidate;
    const patientName = patient.name || patient.email || patientId;
    const diagnosisProbability = typeof result.diagnosis?.probability === 'number'
      ? result.diagnosis.probability
      : null;
    const stageOrRisk = result.severity?.stage
      || result.severity?.severityLevel
      || result.riskAssessment?.level
      || 'Not classified';

    return {
      id: `${patientId}:${result.completedAt || 'latest'}`,
      patientId,
      patientName,
      completedAt: result.completedAt,
      diagnosisLabel: result.diagnosis?.label || 'Assessment completed',
      diagnosisProbability,
      stageOrRisk,
      recommendationTitle: result.recommendations?.title || 'Recommendations available',
      result
    };
  }

  private normalizeEmailList(emails: string[]): string[] {
    return this.uniqueNormalized(emails || []);
  }

  private uniqueNormalized(values: string[]): string[] {
    const seen = new Set<string>();
    return values
      .map((value) => String(value || '').trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }
}
