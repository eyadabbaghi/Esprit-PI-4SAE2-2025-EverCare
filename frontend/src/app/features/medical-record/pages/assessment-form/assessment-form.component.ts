import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { AssessmentCreateRequest, AssessmentReport } from '../../models/assessment.model';
import { AssessmentService } from '../../services/assessment.service';
import { MedicalRecordService } from '../../services/medical-record.service';
import { MedicalRecord } from '../../models/medical-record.model';
import type { AlzheimerStage } from '../../models/medical-record.model';

interface AssessmentQuestion {
  key: string;
  label: string;
}

type AssessmentKey =
  | 'memory_recent'
  | 'orientation_time'
  | 'orientation_place'
  | 'language_difficulty'
  | 'daily_activities'
  | 'mood_changes'
  | 'attention_loss'
  | 'caregiver_burden';

@Component({
  selector: 'app-assessment-form',
  templateUrl: './assessment-form.component.html',
  styleUrl: './assessment-form.component.css'
})
export class AssessmentFormComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,255}$/;

  readonly questions: Array<{ key: AssessmentKey; label: string }> = [
    { key: 'memory_recent', label: 'Troubles de mémoire récente' },
    { key: 'orientation_time', label: 'Désorientation temporelle' },
    { key: 'orientation_place', label: 'Désorientation spatiale' },
    { key: 'language_difficulty', label: 'Difficulté de langage' },
    { key: 'daily_activities', label: 'Impact sur les activités quotidiennes' },
    { key: 'mood_changes', label: 'Changements d’humeur/comportement' },
    { key: 'attention_loss', label: 'Perte d’attention ou concentration' },
    { key: 'caregiver_burden', label: 'Charge de l’aidant' }
  ];
  readonly maxScore = this.questions.length * 3;

  readonly form = this.formBuilder.group({
    patientName: this.formBuilder.control('', [Validators.maxLength(255)]),
    caregiverName: this.formBuilder.control('', [Validators.maxLength(255), Validators.pattern(this.namePattern)]),
    memory_recent: this.formBuilder.control(0, [Validators.min(0), Validators.max(3)]),
    orientation_time: this.formBuilder.control(0, [Validators.min(0), Validators.max(3)]),
    orientation_place: this.formBuilder.control(0, [Validators.min(0), Validators.max(3)]),
    language_difficulty: this.formBuilder.control(0, [Validators.min(0), Validators.max(3)]),
    daily_activities: this.formBuilder.control(0, [Validators.min(0), Validators.max(3)]),
    mood_changes: this.formBuilder.control(0, [Validators.min(0), Validators.max(3)]),
    attention_loss: this.formBuilder.control(0, [Validators.min(0), Validators.max(3)]),
    caregiver_burden: this.formBuilder.control(0, [Validators.min(0), Validators.max(3)])
  });

  currentUser: User | null = null;
  patientId = '';
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  previousReports: AssessmentReport[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly assessmentService: AssessmentService,
    private readonly router: Router,
    private readonly medicalRecordService: MedicalRecordService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.patientId = this.resolvePatientId(user);
      this.prefillPatientName(user);
      if (this.patientId) {
        this.loadPreviousReports();
      }
    });
  }

  submit(): void {
    if (!this.patientId) {
      this.errorMessage = 'Patient introuvable. Veuillez vous reconnecter.';
      return;
    }
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = true;

    const raw = this.form.getRawValue();
    const answers: Record<string, number> = {};
    for (const question of this.questions) {
      answers[question.key] = raw[question.key];
    }

    const payload: AssessmentCreateRequest = {
      patientId: this.patientId,
      patientName: this.toNullable(raw.patientName),
      caregiverName: this.toNullable(raw.caregiverName),
      answers
    };

    this.assessmentService.create(payload).subscribe({
      next: (report) => {
        this.isSubmitting = false;
        this.successMessage = 'Évaluation créée avec succès. Création du dossier médical initial...';
        
        // Create medical record with initial stage
        const stage = this.previewStage;
        this.medicalRecordService.autoCreate({ 
          patientId: this.patientId, 
          alzheimerStage: stage 
        }).subscribe({
          next: () => {
            this.router.navigate(['/medical-record']);
          },
          error: (err: any) => {
            console.warn('Failed to auto-create medical record:', err);
            // Still navigate even if auto-create fails (assessment succeeded)
            this.router.navigate(['/medical-record']);
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage = this.extractError(error, 'Échec de la création du rapport.');
      }
    });
  }

  resetForm(): void {
    const currentPatientName = this.form.getRawValue().patientName;

    this.form.reset({
      patientName: currentPatientName,
      caregiverName: '',
      memory_recent: 0,
      orientation_time: 0,
      orientation_place: 0,
      language_difficulty: 0,
      daily_activities: 0,
      mood_changes: 0,
      attention_loss: 0,
      caregiver_burden: 0
    });
    this.errorMessage = '';
    this.successMessage = '';
  }

  openLatestReport(): void {
    const latest = this.previousReports[0];
    if (!latest) {
      return;
    }
    this.router.navigate(['/assessment/report', latest.id]);
  }

  private loadPreviousReports(): void {
    this.isLoading = true;
    this.assessmentService.getByPatient(this.patientId).subscribe({
      next: (reports) => {
        this.previousReports = reports;
        this.isLoading = false;
      },
      error: () => {
        this.previousReports = [];
        this.isLoading = false;
      }
    });
  }

  private resolvePatientId(user: User | null): string {
    if (user?.userId && user.userId.trim()) {
      return user.userId.trim();
    }
    if (user?.email && user.email.trim()) {
      return user.email.trim();
    }

    if (typeof window !== 'undefined') {
      const localRole = window.localStorage.getItem('role');
      const localPatientId = window.localStorage.getItem('patientId');
      if (localRole?.toUpperCase() === 'PATIENT' && localPatientId?.trim()) {
        return localPatientId.trim();
      }
    }

    return '';
  }

  private prefillPatientName(user: User | null): void {
    const fromUser = user?.name?.trim();
    if (fromUser) {
      this.form.controls.patientName.setValue(fromUser);
      return;
    }

    if (typeof window !== 'undefined') {
      const localFullName = window.localStorage.getItem('fullName');
      if (localFullName && localFullName.trim()) {
        this.form.controls.patientName.setValue(localFullName.trim());
        return;
      }

      const localUserName = window.localStorage.getItem('userName');
      if (localUserName && localUserName.trim()) {
        this.form.controls.patientName.setValue(localUserName.trim());
        return;
      }
    }

    this.form.controls.patientName.setValue(this.patientId || '');
  }

  private toNullable(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private extractError(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }

  hasError(controlName: keyof typeof this.form.controls, errorKey: string): boolean {
    const control = this.form.controls[controlName];
    return control.touched && !!control.errors?.[errorKey];
  }

  get totalScore(): number {
    return this.questions.reduce((sum, question) => sum + this.form.controls[question.key].value, 0);
  }

  get previewStage(): 'EARLY' | 'MIDDLE' | 'LATE' {
    if (this.totalScore <= 7) {
      return 'EARLY';
    }
    if (this.totalScore <= 14) {
      return 'MIDDLE';
    }
    return 'LATE';
  }

  get previewAlertLabel(): string {
    return this.previewStage === 'LATE' ? 'Attention élevée' : 'Surveillance';
  }

  get previewPercent(): number {
    return Math.round((this.totalScore / this.maxScore) * 100);
  }

  getSelectClass(key: AssessmentKey): string {
    return `level-${this.form.controls[key].value}`;
  }
}
