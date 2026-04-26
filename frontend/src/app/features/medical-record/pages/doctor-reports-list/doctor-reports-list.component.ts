import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import {
  AssessmentReport,
  AssessmentStageFilter,
  ClinicalAlert,
  ClinicalAlertStatus
} from '../../models/assessment.model';
import { AssessmentService } from '../../services/assessment.service';
import { MedicalRecordService } from '../../services/medical-record.service';

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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly assessmentService: AssessmentService,
    private readonly medicalRecordService: MedicalRecordService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.errorMessage = 'Chargement des rapports dans le navigateur...';
      return;
    }

    this.route.queryParamMap.subscribe((params) => {
      this.patientFilterId = (params.get('patientId') ?? '').trim();
      if (this.patientFilterId) {
        this.alertsOnly = false;
      }
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
    this.medicalRecordService.getByPatientId(patientId).subscribe({
      next: (record) => {
        this.router.navigate(['/medical-record', record.id]);
      },
      error: () => {
        this.errorMessage = 'Patient medical dossier not found.';
      }
    });
  }

  clearPatientFilter(): void {
    this.router.navigate(['/doctor/reports']);
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
          this.actionMessage = 'Alerte accusée avec succès.';
        },
        error: (error: HttpErrorResponse) => {
          this.acknowledgingReportId = null;
          this.errorMessage = this.extractError(error, "Impossible d'accuser l'alerte.");
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
          this.actionMessage = 'Alerte résolue avec succès.';
        },
        error: (error: HttpErrorResponse) => {
          this.resolvingReportId = null;
          this.errorMessage = this.extractError(error, "Impossible de résoudre l'alerte.");
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
    this.alertByReportId = {};

    if (this.isPatientFiltered) {
      this.assessmentService.getByPatient(this.patientFilterId).subscribe({
        next: (reports) => {
          if (token !== this.loadRequestToken) {
            return;
          }
          this.reports = [...reports].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.syncAlertActions();
          this.page = 0;
          this.totalElements = this.reports.length;
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
        this.errorMessage = this.extractError(error, "Impossible d'initialiser l'alerte pour ce rapport.");
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
}
