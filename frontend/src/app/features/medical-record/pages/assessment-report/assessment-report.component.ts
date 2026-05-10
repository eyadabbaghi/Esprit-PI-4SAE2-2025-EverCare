import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { AssessmentReport } from '../../models/assessment.model';
import { AssessmentService } from '../../services/assessment.service';
import { MedicalRecordService } from '../../services/medical-record.service';
import { resolveRole } from '../../utils/medical-record-permissions';

@Component({
  selector: 'app-assessment-report',
  templateUrl: './assessment-report.component.html',
  styleUrl: './assessment-report.component.css'
})
export class AssessmentReportComponent implements OnInit {
  readonly disclaimer = 'This report is a preliminary assessment and does not replace a medical diagnosis.';

  report: AssessmentReport | null = null;
  previousReports: AssessmentReport[] = [];
  currentUser: User | null = null;
  currentRole: string | undefined;
  isLoading = false;
  errorMessage = '';
  infoMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly assessmentService: AssessmentService,
    private readonly medicalRecordService: MedicalRecordService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing report ID.';
      return;
    }

    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.currentRole = resolveRole(user?.role);
    });

    this.loadReport(id);
  }

  downloadPdf(): void {
    if (!this.report) {
      return;
    }

    this.assessmentService.downloadPdf(this.report.id).subscribe({
      next: (response: HttpResponse<Blob>) => {
        const blob = response.body;
        if (!blob) {
          this.infoMessage = 'No PDF file was returned.';
          return;
        }

        const fileName = this.extractFileName(response) || `assessment-${this.report!.id}.pdf`;
        const url = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.infoMessage = 'PDF download unavailable.';
      }
    });
  }

  openReport(reportId: string): void {
    this.router.navigate(['/assessment/report', reportId]);
  }

  openDossier(): void {
    if (!this.report) {
      return;
    }

    this.medicalRecordService.getByPatientId(this.report.patientId).subscribe({
      next: (record) => {
        this.router.navigate(['/medical-record', record.id]);
      },
      error: () => {
        this.errorMessage = 'Medical record not found for this patient.';
      }
    });
  }

  private loadReport(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    this.assessmentService.getById(id).subscribe({
      next: (report) => {
        if (this.isPatientRole() && !this.isOwnPatient(report.patientId)) {
          this.report = null;
          this.errorMessage = 'You can only view your own assessment reports.';
          this.isLoading = false;
          return;
        }

        if (this.isCareTeamRole()) {
          this.verifyAssociatedPatient(report.patientId).subscribe((allowed) => {
            if (!allowed) {
              this.report = null;
              this.errorMessage = 'You can only view reports for your associated patients.';
              this.isLoading = false;
              return;
            }

            this.acceptReport(report);
          });
          return;
        }

        this.acceptReport(report);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Report not found.');
        this.isLoading = false;
      }
    });
  }

  private acceptReport(report: AssessmentReport): void {
    this.report = report;
    this.isLoading = false;
    this.loadPreviousReports(report.patientId);
  }

  private loadPreviousReports(patientId: string): void {
    this.assessmentService.getByPatient(patientId).subscribe({
      next: (reports) => {
        this.previousReports = reports;
      },
      error: () => {
        this.previousReports = [];
      }
    });
  }

  private extractFileName(response: HttpResponse<Blob>): string | null {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (!contentDisposition) {
      return null;
    }

    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    return match ? match[1] : null;
  }

  private extractError(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }

  private isPatientRole(): boolean {
    return this.currentRole === 'PATIENT';
  }

  private isCareTeamRole(): boolean {
    return this.currentRole === 'DOCTOR' || this.currentRole === 'CAREGIVER';
  }

  private isOwnPatient(patientId: string): boolean {
    const candidates = this.uniqueNormalized([
      this.currentUser?.userId || '',
      this.currentUser?.email || '',
      this.currentUser?.name || ''
    ]);
    const normalizedPatientId = patientId.trim().toLowerCase();
    return candidates.some((candidate) => candidate.toLowerCase() === normalizedPatientId);
  }

  private verifyAssociatedPatient(patientId: string): Observable<boolean> {
    const currentEmail = String(this.currentUser?.email || '').trim().toLowerCase();
    const directEmails = this.normalizeEmailList(this.currentUser?.patientEmails || []);
    const normalizedPatientId = patientId.trim().toLowerCase();
    if (directEmails.some((email) => email.toLowerCase() === normalizedPatientId)) {
      return of(true);
    }

    const directRequests = directEmails.map((email) =>
      this.authService.getUserByEmail(email).pipe(catchError(() => of(null)))
    );

    const direct$ = directRequests.length > 0 ? forkJoin(directRequests) : of([]);
    const fallback$ = this.authService.searchUsersByRole('', 'PATIENT').pipe(catchError(() => of([])));

    return forkJoin({ direct: direct$, fallback: fallback$ }).pipe(
      map(({ direct, fallback }) => {
        const patients = [
          ...direct.filter((patient): patient is User => !!patient),
          ...(fallback || []).filter((patient) => this.isAssociatedPatientUser(patient, currentEmail))
        ];

        return patients.some((patient) =>
          this.resolvePatientCandidates(patient).some((candidate) => candidate.toLowerCase() === normalizedPatientId)
        );
      }),
      catchError(() => of(false))
    );
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
