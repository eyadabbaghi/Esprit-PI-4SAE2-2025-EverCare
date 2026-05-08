import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  AssessmentReport,
  AssessmentStageFilter,
  ClinicalAlertStatus
} from '../../../medical-record/models/assessment.model';
import { AssessmentService } from '../../../medical-record/services/assessment.service';
import { MedicalRecordService } from '../../../medical-record/services/medical-record.service';

type ReportsActiveFilter = 'active' | 'archived' | 'all';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  reports: AssessmentReport[] = [];

  stageFilter: AssessmentStageFilter = '';
  query = '';
  fromDate = '';
  toDate = '';
  activeFilter: ReportsActiveFilter = 'active';
  alertsOnly = false;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  loading = false;
  errorMessage = '';
  actionMessage = '';
  deletingReportId: string | null = null;
  restoringReportId: string | null = null;
  acknowledgingReportId: string | null = null;
  resolvingReportId: string | null = null;
  private alertByReportId: Record<string, { id: string; status: ClinicalAlertStatus }> = {};

  constructor(
    private readonly router: Router,
    private readonly assessmentService: AssessmentService,
    private readonly medicalRecordService: MedicalRecordService
  ) {}

  ngOnInit(): void {
    this.loadPage(0);
  }

  applyFilters(): void {
    this.actionMessage = '';
    this.loadPage(0);
  }

  resetFilters(): void {
    this.stageFilter = '';
    this.query = '';
    this.fromDate = '';
    this.toDate = '';
    this.activeFilter = 'active';
    this.alertsOnly = false;
    this.actionMessage = '';
    this.loadPage(0);
  }

  toggleAlertsOnly(): void {
    this.alertsOnly = !this.alertsOnly;
    if (this.alertsOnly) {
      this.activeFilter = 'active';
    }
    this.actionMessage = '';
    this.loadPage(0);
  }

  previousPage(): void {
    if (this.page <= 0) {
      return;
    }
    this.loadPage(this.page - 1);
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
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
        this.errorMessage = 'Dossier médical introuvable pour ce patient.';
      }
    });
  }

  getAlertStatus(report: AssessmentReport): ClinicalAlertStatus | null {
    return this.alertByReportId[report.id]?.status ?? null;
  }

  canAcknowledgeAlert(report: AssessmentReport): boolean {
    return this.getAlertStatus(report) === 'OPEN';
  }

  canResolveAlert(report: AssessmentReport): boolean {
    const status = this.getAlertStatus(report);
    return status === 'OPEN' || status === 'ACK';
  }

  acknowledgeAlert(report: AssessmentReport): void {
    const alert = this.alertByReportId[report.id];
    if (!alert || this.acknowledgingReportId || this.resolvingReportId) {
      return;
    }

    this.errorMessage = '';
    this.actionMessage = '';
    this.acknowledgingReportId = report.id;
    this.assessmentService.acknowledgeAlert(alert.id).subscribe({
      next: () => {
        this.acknowledgingReportId = null;
        this.actionMessage = 'Alerte accusée avec succès.';
        this.loadPage(this.page);
      },
      error: (error: HttpErrorResponse) => {
        this.acknowledgingReportId = null;
        this.errorMessage = this.extractError(error, "Impossible d'accuser l'alerte.");
      }
    });
  }

  resolveAlert(report: AssessmentReport): void {
    const alert = this.alertByReportId[report.id];
    if (!alert || this.resolvingReportId || this.acknowledgingReportId) {
      return;
    }

    this.errorMessage = '';
    this.actionMessage = '';
    this.resolvingReportId = report.id;
    this.assessmentService.resolveAlert(alert.id).subscribe({
      next: () => {
        this.resolvingReportId = null;
        this.actionMessage = 'Alerte résolue avec succès.';
        this.loadPage(this.page);
      },
      error: (error: HttpErrorResponse) => {
        this.resolvingReportId = null;
        this.errorMessage = this.extractError(error, "Impossible de résoudre l'alerte.");
      }
    });
  }

  deleteReport(report: AssessmentReport): void {
    if (this.deletingReportId || !report.active) {
      return;
    }

    const label = report.patientName || report.patientId;
    const confirmed = window.confirm(`Supprimer ce rapport du patient "${label}" ?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.deletingReportId = report.id;

    this.assessmentService.archive(report.id).subscribe({
      next: () => {
        this.deletingReportId = null;
        const targetPage = this.reports.length === 1 && this.page > 0 ? this.page - 1 : this.page;
        this.loadPage(targetPage);
      },
      error: (error: HttpErrorResponse) => {
        this.deletingReportId = null;
        this.errorMessage = this.extractError(error, 'Impossible de supprimer le rapport.');
      }
    });
  }

  restoreReport(report: AssessmentReport): void {
    if (this.restoringReportId || report.active) {
      return;
    }

    this.errorMessage = '';
    this.restoringReportId = report.id;

    this.assessmentService.restore(report.id).subscribe({
      next: () => {
        this.restoringReportId = null;
        this.loadPage(this.page);
      },
      error: (error: HttpErrorResponse) => {
        this.restoringReportId = null;
        this.errorMessage = this.extractError(error, 'Impossible de réactiver le rapport.');
      }
    });
  }

  private loadPage(page: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.actionMessage = '';
    this.alertByReportId = {};

    const request$ = this.alertsOnly
      ? this.assessmentService.getAlerts(page, this.size)
      : this.assessmentService.getPage(
          page,
          this.size,
          this.stageFilter,
          this.fromDate,
          this.toDate,
          this.query,
          this.resolveActiveFilterParam()
        );

    request$.subscribe({
      next: (response) => {
        this.reports = response.content;
        this.syncAlertActions();
        this.page = response.number;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Impossible de charger les rapports.');
        this.loading = false;
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

  private extractError(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }

  private resolveActiveFilterParam(): boolean | undefined {
    if (this.activeFilter === 'active') {
      return true;
    }
    if (this.activeFilter === 'archived') {
      return false;
    }
    return undefined;
  }
}
