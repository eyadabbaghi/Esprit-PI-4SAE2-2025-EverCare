import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { MedicalDocument } from '../../models/medical-document.model';
import { CreateMedicalHistoryRequest, MedicalHistory, MedicalHistoryType } from '../../models/medical-history.model';
import { MedicalRecord } from '../../models/medical-record.model';
import { MedicalDocumentService } from '../../services/medical-document.service';
import { MedicalHistoryService } from '../../services/medical-history.service';
import { MedicalRecordService } from '../../services/medical-record.service';
import { AssessmentService } from '../../services/assessment.service';
import {
  canManageArchivedRecord,
  getMedicalRecordPermissions,
  MedicalRecordPermissions,
  resolveRole,
} from '../../utils/medical-record-permissions';
import { AssessmentReport } from '../../models/assessment.model';
import { AlzheimerStage } from '../../models/medical-record.model';

function noFutureDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  if (!value) {
    return null;
  }
  const today = new Date().toISOString().slice(0, 10);
  return value > today ? { futureDate: true } : null;
}

interface StageTransition {
  from: AlzheimerStage | null;
  to: AlzheimerStage;
  createdAt: string;
  score: number;
}

interface CompletenessItem {
  key: string;
  label: string;
  completed: boolean;
}

@Component({
  selector: 'app-medical-record-details',
  templateUrl: './medical-record-details.component.html',
  styleUrl: './medical-record-details.component.css'
})
export class MedicalRecordDetailsComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private static readonly MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg']);

  readonly historyTypes: MedicalHistoryType[] = ['CONSULTATION', 'INCIDENT', 'MEDICATION', 'VITAL_SIGN'];
  readonly historyForm = this.formBuilder.group({
    type: this.formBuilder.control<MedicalHistoryType>('CONSULTATION', Validators.required),
    date: this.formBuilder.control(this.todayIsoDate(), [Validators.required, noFutureDateValidator]),
    description: this.formBuilder.control('', [Validators.required, Validators.maxLength(2000)])
  });
  readonly todayMaxDate = this.todayIsoDate();

  record: MedicalRecord | null = null;
  histories: MedicalHistory[] = [];
  documents: MedicalDocument[] = [];
  patientDisplayName = '';
  latestAssessment: AssessmentReport | null = null;
  stageTransitions: StageTransition[] = [];
  completenessItems: CompletenessItem[] = [];
  completenessScore = 0;

  selectedFile: File | null = null;
  permissions: MedicalRecordPermissions = getMedicalRecordPermissions(null);
  currentUser: User | null = null;
  currentRole: string | undefined;
  patientIdentifier = '';

  isLoading = false;
  isHistorySubmitting = false;
  isDocumentUploading = false;
  errorMessage = '';
  historyError = '';
  documentError = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly historyService: MedicalHistoryService,
    private readonly documentService: MedicalDocumentService,
    private readonly assessmentService: AssessmentService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.currentRole = resolveRole(user?.role);
      this.permissions = getMedicalRecordPermissions(this.currentRole);
      this.patientIdentifier = this.resolvePatientIdentifier(user);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Medical record id is missing.';
      return;
    }
    this.loadRecord(id);
  }

  get canMutateRecord(): boolean {
    return this.record !== null && canManageArchivedRecord(this.record);
  }

  addHistory(): void {
    if (!this.permissions.canManageHistory) {
      this.historyError = 'You are not allowed to manage history.';
      return;
    }

    if (!this.record || !this.canMutateRecord || this.historyForm.invalid || this.isHistorySubmitting) {
      this.historyForm.markAllAsTouched();
      return;
    }

    const raw = this.historyForm.getRawValue();
    const normalizedDescription = raw.description.trim();
    if (!normalizedDescription) {
      this.historyError = 'Description is required.';
      this.historyForm.controls.description.markAsTouched();
      return;
    }

    const payload: CreateMedicalHistoryRequest = {
      ...raw,
      description: normalizedDescription
    };
    this.historyError = '';
    this.isHistorySubmitting = true;

    this.historyService.addToRecord(this.record.id, payload).subscribe({
      next: (history) => {
        this.histories = [history, ...this.histories];
        this.historyForm.patchValue({
          type: 'CONSULTATION',
          date: this.todayIsoDate(),
          description: ''
        });
        this.isHistorySubmitting = false;
      },
      error: (error: HttpErrorResponse) => {
        this.historyError = this.extractError(error, 'Failed to add history item.');
        this.isHistorySubmitting = false;
      }
    });
  }

  deleteHistory(historyId: string): void {
    if (!this.permissions.canManageHistory || !this.record || !this.canMutateRecord) {
      return;
    }

    this.historyService.delete(this.record.id, historyId).subscribe({
      next: () => {
        this.histories = this.histories.filter((history) => history.id !== historyId);
      },
      error: (error: HttpErrorResponse) => {
        this.historyError = this.extractError(error, 'Failed to delete history item.');
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.documentError = '';

    if (!file) {
      this.selectedFile = null;
      return;
    }

    const extension = this.extractExtension(file.name);
    if (!extension || !MedicalRecordDetailsComponent.ALLOWED_EXTENSIONS.has(extension)) {
      this.selectedFile = null;
      this.documentError = 'Unsupported file type. Allowed: pdf, png, jpg, jpeg.';
      input.value = '';
      return;
    }

    if (file.size > MedicalRecordDetailsComponent.MAX_UPLOAD_SIZE_BYTES) {
      this.selectedFile = null;
      this.documentError = 'File size must be <= 5MB.';
      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  uploadDocument(): void {
    if (!this.permissions.canManageDocuments) {
      this.documentError = 'You are not allowed to manage documents.';
      return;
    }

    if (!this.record || !this.selectedFile || !this.canMutateRecord || this.isDocumentUploading) {
      return;
    }

    this.documentError = '';
    this.isDocumentUploading = true;

    this.documentService.upload(this.record.id, this.selectedFile).subscribe({
      next: (document) => {
        this.documents = [document, ...this.documents];
        this.selectedFile = null;
        this.isDocumentUploading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.documentError = this.extractError(error, 'Failed to upload document.');
        this.isDocumentUploading = false;
      }
    });
  }

  downloadDocument(document: MedicalDocument): void {
    if (!this.record) {
      return;
    }

    this.documentService.download(this.record.id, document.id).subscribe({
      next: (response: HttpResponse<Blob>) => {
        const blob = response.body;
        if (!blob) {
          this.documentError = 'No file content returned by server.';
          return;
        }

        const fileName = this.extractFileName(response) || document.fileName;
        const url = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => {
        this.documentError = this.extractError(error, 'Failed to download document.');
      }
    });
  }

  deleteDocument(documentId: string): void {
    if (!this.permissions.canManageDocuments || !this.record || !this.canMutateRecord) {
      return;
    }

    this.documentService.delete(this.record.id, documentId).subscribe({
      next: () => {
        this.documents = this.documents.filter((document) => document.id !== documentId);
      },
      error: (error: HttpErrorResponse) => {
        this.documentError = this.extractError(error, 'Failed to delete document.');
      }
    });
  }

  archiveRecord(): void {
    if (!this.permissions.canArchive || !this.record || !this.canMutateRecord) {
      return;
    }

    this.medicalRecordService.archive(this.record.id).subscribe({
      next: () => {
        this.record = { ...this.record!, active: false };
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Failed to archive medical record.');
      }
    });
  }

  restoreRecord(): void {
    if (this.currentRole !== 'ADMIN' || !this.record || this.record.active) {
      return;
    }

    this.medicalRecordService.restore(this.record.id).subscribe({
      next: (record) => {
        this.record = record;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Failed to restore medical record.');
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/medical-record']);
  }

  private loadRecord(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.medicalRecordService.getById(id).subscribe({
      next: (record) => {
        if (this.isPatientRole() && !this.isOwnRecord(record)) {
          this.record = null;
          this.errorMessage = 'Vous pouvez consulter uniquement votre dossier médical.';
          this.isLoading = false;
          return;
        }

        this.record = record;
        this.resolvePatientDisplayName(record.patientId);
        this.isLoading = false;
        this.loadHistory(record.id);
        this.loadDocuments(record.id);
        this.loadAssessments(record.patientId);
        this.refreshCompleteness();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Medical record not found.');
        this.isLoading = false;
      }
    });
  }

  private loadHistory(recordId: string): void {
    this.historyService.listByRecord(recordId).subscribe({
      next: (histories) => {
        this.histories = histories;
        this.refreshCompleteness();
      },
      error: () => {
        this.historyError = 'Failed to load history.';
      }
    });
  }

  private loadDocuments(recordId: string): void {
    this.documentService.listByRecord(recordId).subscribe({
      next: (documents) => {
        this.documents = documents;
        this.refreshCompleteness();
      },
      error: () => {
        this.documentError = 'Failed to load documents.';
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

  private todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private extractError(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }

  hasHistoryError(controlName: keyof typeof this.historyForm.controls, errorKey: string): boolean {
    const control = this.historyForm.controls[controlName];
    return control.touched && !!control.errors?.[errorKey];
  }

  private isPatientRole(): boolean {
    return this.currentRole === 'PATIENT';
  }

  private isOwnRecord(record: MedicalRecord): boolean {
    if (!this.patientIdentifier) {
      return false;
    }

    return record.patientId.trim().toLowerCase() === this.patientIdentifier.toLowerCase();
  }

  private resolvePatientIdentifier(user: User | null): string {
    if (user?.userId && user.userId.trim()) {
      return user.userId.trim();
    }

    if (user?.email && user.email.trim()) {
      return user.email.trim();
    }

    if (user?.name && user.name.trim()) {
      return user.name.trim();
    }

    if (typeof window !== 'undefined') {
      const localPatientId = window.localStorage.getItem('patientId');
      if (localPatientId && localPatientId.trim()) {
        return localPatientId.trim();
      }
    }

    return '';
  }

  private extractExtension(fileName: string): string | null {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
      return null;
    }
    return fileName.slice(lastDotIndex + 1).toLowerCase();
  }

  private resolvePatientDisplayName(patientId: string): void {
    this.patientDisplayName = this.fallbackPatientDisplayName(patientId);
    this.refreshCompleteness();
  }

  private fallbackPatientDisplayName(patientId: string): string {
    if (this.isOwnPatientIdentifier(patientId) && this.currentUser?.name?.trim()) {
      return this.currentUser.name.trim();
    }

    if (this.isUuid(patientId)) {
      return 'Non renseigné';
    }

    return patientId;
  }

  private isOwnPatientIdentifier(patientId: string): boolean {
    return !!this.patientIdentifier && patientId.trim().toLowerCase() === this.patientIdentifier.toLowerCase();
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
  }

  private loadAssessments(patientId: string): void {
    this.assessmentService.getByPatient(patientId).subscribe({
      next: (reports) => {
        const sorted = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const reportWithName = sorted.find((report) => typeof report.patientName === 'string' && report.patientName.trim().length > 0);
        if (reportWithName?.patientName) {
          this.patientDisplayName = reportWithName.patientName.trim();
        }
        this.latestAssessment = sorted.length > 0 ? sorted[0] : null;
        this.stageTransitions = this.buildStageTransitions(sorted);
        this.refreshCompleteness();
      },
      error: () => {
        this.latestAssessment = null;
        this.stageTransitions = [];
        this.refreshCompleteness();
      }
    });
  }

  private buildStageTransitions(reportsNewestFirst: AssessmentReport[]): StageTransition[] {
    if (reportsNewestFirst.length === 0) {
      return [];
    }

    const ordered = [...reportsNewestFirst].reverse();
    const transitions: StageTransition[] = [];
    let previous: AlzheimerStage | null = null;

    ordered.forEach((report) => {
      if (previous === null || report.computedStage !== previous) {
        transitions.push({
          from: previous,
          to: report.computedStage,
          createdAt: report.createdAt,
          score: report.score
        });
      }
      previous = report.computedStage;
    });

    return transitions.reverse();
  }

  private refreshCompleteness(): void {
    const currentRecord = this.record;
    if (!currentRecord) {
      this.completenessItems = [];
      this.completenessScore = 0;
      return;
    }

    const hasKnownName = !!this.patientDisplayName && this.patientDisplayName !== 'Non renseigné';
    const items: CompletenessItem[] = [
      { key: 'patientName', label: 'Nom du patient', completed: hasKnownName },
      { key: 'bloodGroup', label: 'Groupe sanguin', completed: !!currentRecord.bloodGroup },
      { key: 'emergencyContactName', label: "Contact d'urgence", completed: !!currentRecord.emergencyContactName },
      { key: 'emergencyContactPhone', label: "Téléphone d'urgence", completed: !!currentRecord.emergencyContactPhone },
      { key: 'allergies', label: 'Allergies', completed: !!currentRecord.allergies },
      { key: 'chronicDiseases', label: 'Maladies chroniques', completed: !!currentRecord.chronicDiseases },
      { key: 'history', label: 'Historique médical', completed: this.histories.length > 0 },
      { key: 'documents', label: 'Documents médicaux', completed: this.documents.length > 0 },
      { key: 'assessment', label: "Évaluation Alzheimer", completed: this.latestAssessment !== null }
    ];

    this.completenessItems = items;
    const completedCount = items.filter((item) => item.completed).length;
    this.completenessScore = Math.round((completedCount / items.length) * 100);
  }

  get missingCompletenessItems(): CompletenessItem[] {
    return this.completenessItems.filter((item) => !item.completed);
  }

  get statusHint(): string {
    if (!this.record) {
      return '';
    }
    return this.record.active
      ? 'Dossier actif: modifications et ajouts autorisés selon le rôle.'
      : 'Dossier archivé: modifications, historique et documents verrouillés.';
  }

  get archiveReasonText(): string {
    if (!this.record || this.record.active) {
      return 'Aucune raison: dossier actif.';
    }
    return "Archivé par un professionnel via l'action d'archivage.";
  }

  formatStage(stage: AlzheimerStage | null): string {
    if (!stage) {
      return '-';
    }

    const labels: Record<AlzheimerStage, string> = {
      EARLY: 'EARLY',
      MIDDLE: 'MIDDLE',
      LATE: 'LATE'
    };

    return labels[stage];
  }

  openLatestAssessmentReport(): void {
    if (!this.latestAssessment) {
      return;
    }
    this.router.navigate(['/assessment/report', this.latestAssessment.id]);
  }
}
