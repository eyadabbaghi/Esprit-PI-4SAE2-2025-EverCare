import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { AssessmentCreateRequest, AssessmentReport } from '../../models/assessment.model';
import { AssessmentService } from '../../services/assessment.service';

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
    { key: 'memory_recent', label: 'Recent memory problems' },
    { key: 'orientation_time', label: 'Time disorientation' },
    { key: 'orientation_place', label: 'Place disorientation' },
    { key: 'language_difficulty', label: 'Language difficulty' },
    { key: 'daily_activities', label: 'Impact on daily activities' },
    { key: 'mood_changes', label: 'Mood or behavior changes' },
    { key: 'attention_loss', label: 'Loss of attention or concentration' },
    { key: 'caregiver_burden', label: 'Caregiver burden' }
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
  caregiverEmail = '';
  caregiverPreview: User | null = null;
  caregiverPreviewMessage = '';
  isLookingUpCaregiver = false;
  caregiverAssociationMessage = '';
  showCaregiverAssociationModal = false;
  isAssociatingCaregiver = false;
  isRequestingCaregiverFill = false;
  showAssessmentIntro = false;
  private assessmentIntroDismissed = false;
  private caregiverLookupTimer: ReturnType<typeof setTimeout> | null = null;
  targetPatientEmail = '';
  targetPatientName = '';

  get isOnboardingSource(): boolean {
    return this.route.snapshot.queryParamMap.get('source') === 'onboarding';
  }

  get isCaregiverFillMode(): boolean {
    return this.currentUser?.role === 'CAREGIVER' && !!this.patientId;
  }

  constructor(
    private readonly authService: AuthService,
    private readonly assessmentService: AssessmentService,
    private readonly notificationService: NotificationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly feedback: AppFeedbackService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      const targetPatientId = this.route.snapshot.queryParamMap.get('patientId')?.trim() || '';
      this.targetPatientEmail = this.route.snapshot.queryParamMap.get('patientEmail')?.trim() || '';
      this.targetPatientName = this.route.snapshot.queryParamMap.get('patientName')?.trim() || '';

      if (user?.role === 'CAREGIVER') {
        if (!targetPatientId || !this.isAssociatedPatientEmail(user, this.targetPatientEmail)) {
          this.errorMessage = 'Choose one of your associated patients from your profile before filling their assessment.';
          this.router.navigate(['/profile']);
          return;
        }

        this.patientId = targetPatientId;
        this.prefillCaregiverTarget(user);
        this.loadPreviousReports();
        return;
      }

      if (user && user.role !== 'PATIENT') {
        this.router.navigate(['/']);
        return;
      }

      if (this.isOnboardingSource && user?.role === 'PATIENT' && !this.assessmentIntroDismissed) {
        this.showAssessmentIntro = true;
      }

      this.patientId = this.resolvePatientId(user);
      this.prefillPatientName(user);
      if (this.patientId) {
        this.loadPreviousReports();
      }
    });
  }

  submit(): void {
    if (!this.patientId) {
      this.errorMessage = 'Patient not found. Please sign in again.';
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
        this.successMessage = 'Assessment created successfully.';
        const source = this.route.snapshot.queryParamMap.get('source');
        const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
        if (source === 'onboarding') {
          this.prepareHomeWelcomeAfterMedicalRecord();
          this.router.navigate(['/']);
        } else if (returnTo === 'profile') {
          this.router.navigate(['/profile']);
        } else {
          this.router.navigate(['/assessment/report', report.id]);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage = this.extractError(error, 'Failed to create the report.');
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

  startAssessmentNow(): void {
    this.assessmentIntroDismissed = true;
    this.showAssessmentIntro = false;
  }

  requestCaregiverFillFromIntro(): void {
    this.assessmentIntroDismissed = true;
    this.showAssessmentIntro = false;
    this.requestCaregiverFill();
  }

  // Kept for older template/event compatibility; the onboarding skip button is no longer displayed.
  skipOnboardingAssessment(): void {
    if (!this.isOnboardingSource) {
      this.router.navigate(['/medical-record']);
      return;
    }

    this.prepareHomeWelcomeAfterMedicalRecord();
    this.router.navigate(['/']);
  }

  requestCaregiverFill(): void {
    this.showAssessmentIntro = false;
    if (!this.currentUser || this.currentUser.role !== 'PATIENT') {
      this.errorMessage = 'Only patients can request caregiver completion from this screen.';
      return;
    }

    const caregiverEmails = this.normalizedEmails(this.currentUser.caregiverEmails || []);
    if (caregiverEmails.length === 0) {
      this.caregiverAssociationMessage = 'You need to associate a caregiver before they can fill your medical record and assessment.';
      this.showCaregiverAssociationModal = true;
      return;
    }

    this.notifyCaregiversForMedicalRecord(caregiverEmails);
  }

  closeCaregiverAssociationModal(): void {
    if (this.isAssociatingCaregiver) {
      return;
    }
    this.showCaregiverAssociationModal = false;
    this.caregiverAssociationMessage = '';
    this.caregiverEmail = '';
    this.caregiverPreview = null;
    this.caregiverPreviewMessage = '';
    this.clearCaregiverLookup();
  }

  onCaregiverEmailChange(value: string): void {
    this.clearCaregiverLookup();
    this.caregiverPreview = null;
    this.caregiverPreviewMessage = '';
    const email = String(value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      this.isLookingUpCaregiver = false;
      return;
    }

    this.isLookingUpCaregiver = true;
    this.caregiverLookupTimer = setTimeout(() => {
      this.authService.getUserByEmail(email).subscribe({
        next: (user) => {
          if (this.caregiverEmail.trim().toLowerCase() !== email) {
            return;
          }
          this.isLookingUpCaregiver = false;
          if (user.role !== 'CAREGIVER') {
            this.caregiverPreviewMessage = 'This email is not a caregiver account.';
            return;
          }
          this.caregiverPreview = user;
        },
        error: () => {
          if (this.caregiverEmail.trim().toLowerCase() !== email) {
            return;
          }
          this.isLookingUpCaregiver = false;
          this.caregiverPreviewMessage = 'No caregiver account was found with this full email.';
        }
      });
    }, 350);
  }

  associateCaregiverAndRequestFill(): void {
    const email = this.caregiverEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.caregiverAssociationMessage = 'Enter a valid caregiver email to continue.';
      return;
    }

    this.isAssociatingCaregiver = true;
    this.caregiverAssociationMessage = '';

    this.authService.updateProfile({ connectedEmail: email }).subscribe({
      next: () => {
        this.authService.fetchCurrentUser().subscribe({
          next: (user) => {
            this.currentUser = user;
            this.isAssociatingCaregiver = false;
            this.showCaregiverAssociationModal = false;
            this.feedback.success('Caregiver linked successfully. We will notify them now.', 'Caregiver linked');
            this.sendConnectionNotification(email);
            this.notifyCaregiversForMedicalRecord([email]);
          },
          error: () => {
            this.isAssociatingCaregiver = false;
            this.caregiverAssociationMessage = 'Caregiver was associated, but the profile could not refresh. Please try again.';
            this.feedback.warning(this.caregiverAssociationMessage, 'Profile refresh needed');
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isAssociatingCaregiver = false;
        this.caregiverAssociationMessage = this.extractError(error, 'Caregiver not found. Please use an existing caregiver account email.');
        this.feedback.error(this.caregiverAssociationMessage, 'Caregiver not found');
      }
    });
  }

  openLatestReport(): void {
    const latest = this.previousReports[0];
    if (!latest) {
      return;
    }
    this.router.navigate(['/assessment/report', latest.id]);
  }

  private notifyCaregiversForMedicalRecord(caregiverEmails: string[]): void {
    if (!this.patientId || this.isRequestingCaregiverFill) {
      return;
    }

    const targetUserIds = this.normalizedEmails(caregiverEmails);
    if (targetUserIds.length === 0) {
      this.errorMessage = 'No caregiver email is linked to this profile yet.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isRequestingCaregiverFill = true;

    const patientName = this.form.controls.patientName.value || this.currentUser?.name || 'your patient';
    const patientEmail = this.currentUser?.email || '';

    this.notificationService.sendNotification({
      activityId: `medical-record-request:${this.patientId}`,
      action: 'MEDICAL_RECORD_CAREGIVER_REQUEST',
      details: JSON.stringify({
        message: `${patientName} asked you to fill their medical record and medical record assessment.`,
        patientId: this.patientId,
        patientName,
        patientEmail
      }),
      targetUserIds
    }).subscribe({
      next: () => {
        this.isRequestingCaregiverFill = false;
        this.successMessage = 'Your caregiver has been notified to fill your medical record and assessment.';
        this.feedback.success(this.successMessage, 'Request sent');
        if (this.isOnboardingSource) {
          setTimeout(() => this.finishOnboardingAfterCaregiverRequest(), 900);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isRequestingCaregiverFill = false;
        this.errorMessage = this.extractError(error, 'Unable to notify your caregiver right now.');
        this.feedback.error(this.errorMessage, 'Request failed');
      }
    });
  }

  getInitialsFor(name: string | undefined): string {
    if (!name) return 'U';
    return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }

  private clearCaregiverLookup(): void {
    if (this.caregiverLookupTimer) {
      clearTimeout(this.caregiverLookupTimer);
      this.caregiverLookupTimer = null;
    }
  }

  private sendConnectionNotification(targetEmail: string): void {
    const current = this.currentUser;
    if (!current?.email) {
      return;
    }

    this.notificationService.sendNotification({
      activityId: `connection-associated:${current.email}:${targetEmail}:${Date.now()}`,
      action: 'USER_ASSOCIATED',
      details: JSON.stringify({
        message: `${current.name || current.email} associated you on EverCare.`,
        actorName: current.name,
        actorEmail: current.email,
        actorRole: current.role
      }),
      targetUserIds: [targetEmail.trim().toLowerCase()]
    }).subscribe({ error: () => undefined });
  }

  private finishOnboardingAfterCaregiverRequest(): void {
    this.prepareHomeWelcomeAfterMedicalRecord();
    this.router.navigate(['/']);
  }

  private prepareHomeWelcomeAfterMedicalRecord(): void {
    localStorage.removeItem('showAlzheimerAssessment');
    localStorage.setItem('showPostMedicalWelcome', 'true');
    localStorage.setItem('showWelcomeFlow', 'true');
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

  private prefillCaregiverTarget(user: User): void {
    this.form.controls.patientName.setValue(this.targetPatientName || this.targetPatientEmail || this.patientId);
    this.form.controls.caregiverName.setValue(user.name || user.email || '');
  }

  private isAssociatedPatientEmail(user: User, patientEmail: string): boolean {
    const email = patientEmail.trim().toLowerCase();
    if (!email) {
      return false;
    }
    return (user.patientEmails || []).some((candidate) => candidate.trim().toLowerCase() === email);
  }

  private normalizedEmails(emails: string[]): string[] {
    const seen = new Set<string>();
    return emails
      .map((email) => String(email || '').trim())
      .filter((email) => {
        const key = email.toLowerCase();
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
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
    return this.previewStage === 'LATE' ? 'High attention needed' : 'Monitoring';
  }

  get previewPercent(): number {
    return Math.round((this.totalScore / this.maxScore) * 100);
  }

  getSelectClass(key: AssessmentKey): string {
    return `level-${this.form.controls[key].value}`;
  }
}
