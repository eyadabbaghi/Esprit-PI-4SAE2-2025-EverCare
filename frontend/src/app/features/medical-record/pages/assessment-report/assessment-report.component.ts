import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { AssessmentReport } from '../../models/assessment.model';
import { AssessmentService } from '../../services/assessment.service';
import { MedicalRecordService } from '../../services/medical-record.service';

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
        this.errorMessage = 'Medical Record introuvable pour ce patient.';
      }
    });
  }

  private loadReport(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';

    this.assessmentService.getById(id).subscribe({
      next: (report) => {
        this.report = report;
        this.isLoading = false;
        this.loadPreviousReports(report.patientId);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Report not found.');
        this.isLoading = false;
      }
    });
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
}
