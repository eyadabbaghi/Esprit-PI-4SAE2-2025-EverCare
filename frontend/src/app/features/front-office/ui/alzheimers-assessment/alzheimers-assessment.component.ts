import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../pages/login/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';

export interface AssessmentResult {
  userId: string;
  completedAt: string;
  cluster: { id: number; label: string; diagnosisRateInCluster: number };
  diagnosis: { predicted: number; probability: number; label: string };
  severity?: {
    mmseEstimate: number;
    stage: string;
    severityLevel: string;
    mmseRange: string;
  };
  riskAssessment?: {
    score: number;
    level: string;
    riskFactors: string[];
  };
  recommendations: {
    path: string;
    title: string;
    description?: string;
    medications?: string[];
    lifestyle?: string[];
    monitoring?: string[];
    support?: string[];
    actions?: string[];
  };
}

@Component({
  selector: 'app-alzheimers-assessment',
  templateUrl: './alzheimers-assessment.component.html',
  styleUrls: ['./alzheimers-assessment.component.css'],
})
export class AlzheimersAssessmentComponent implements OnInit {
  @Input() allowCaregiverDelegation = false;
  @Output() completed = new EventEmitter<AssessmentResult>();
  @Output() skipped = new EventEmitter<void>();
  @Output() caregiverRequested = new EventEmitter<void>();

  currentStep = 0;
  isLoading = false;
  isRequestingCaregiverFill = false;
  isAssociatingCaregiver = false;
  showCaregiverAssociationModal = false;
  showIntro = false;
  caregiverEmail = '';
  caregiverPreview: User | null = null;
  caregiverPreviewMessage = '';
  isLookingUpCaregiver = false;
  assessmentResult: AssessmentResult | null = null;
  private caregiverLookupTimer: ReturnType<typeof setTimeout> | null = null;

  form: FormGroup;

  readonly steps = [
    { title: 'Personal Info', icon: '👤', fields: ['age', 'gender', 'bmi'] },
    { title: 'Lifestyle', icon: '🏃', fields: ['smoking', 'alcoholConsumption', 'physicalActivity', 'dietQuality', 'sleepQuality'] },
    { title: 'Medical History', icon: '🏥', fields: ['familyHistoryAlzheimers', 'cardiovascularDisease', 'diabetes', 'depression', 'headInjury', 'hypertension'] },
    { title: 'Cognitive Assessment', icon: '🧠', fields: ['functionalAssessment', 'memoryComplaints', 'behavioralProblems', 'adl'] },
    { title: 'Symptom Check', icon: '📋', fields: ['confusion', 'disorientation', 'personalityChanges', 'difficultyCompletingTasks', 'forgetfulness'] },
  ];

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private feedback: AppFeedbackService
  ) {
    this.form = this.fb.group({
      // Step 1: Personal info
      age: [65, [Validators.required, Validators.min(18), Validators.max(110)]],
      gender: [0, Validators.required],
      bmi: [25.0, [Validators.required, Validators.min(10), Validators.max(60)]],

      // Step 2: Lifestyle
      smoking: [0],
      alcoholConsumption: [5, [Validators.min(0), Validators.max(20)]],
      physicalActivity: [5, [Validators.min(0), Validators.max(10)]],
      dietQuality: [5, [Validators.min(0), Validators.max(10)]],
      sleepQuality: [7, [Validators.min(0), Validators.max(10)]],

      // Step 3: Medical history
      familyHistoryAlzheimers: [0],
      cardiovascularDisease: [0],
      diabetes: [0],
      depression: [0],
      headInjury: [0],
      hypertension: [0],

      // Step 4: Cognitive assessment
      functionalAssessment: [8, [Validators.min(0), Validators.max(10)]],
      memoryComplaints: [0],
      behavioralProblems: [0],
      adl: [8, [Validators.min(0), Validators.max(10)]],

      // Step 5: Symptoms
      confusion: [0],
      disorientation: [0],
      personalityChanges: [0],
      difficultyCompletingTasks: [0],
      forgetfulness: [0],

      // Optional vitals
      systolicBP: [120],
      diastolicBP: [80],
      cholesterolTotal: [200],
      cholesterolLDL: [120],
      cholesterolHDL: [55],
      cholesterolTriglycerides: [140],
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUserValue();
    if (user?.role !== 'PATIENT' && !this.isCaregiverPatientMode()) {
      this.skipped.emit();
      return;
    }
    this.showIntro = user?.role === 'PATIENT' && !this.isCaregiverPatientMode();
  }

  get canDelegateToCaregiver(): boolean {
    return this.allowCaregiverDelegation
      && this.authService.getCurrentUserValue()?.role === 'PATIENT'
      && !this.isCaregiverPatientMode();
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  get progressPercent(): number {
    return ((this.currentStep) / this.totalSteps) * 100;
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
    } else {
      this.submitAssessment();
    }
  }

  startAssessmentNow(): void {
    this.showIntro = false;
  }

  doAssessmentLater(): void {
    this.showIntro = false;
    this.skip();
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  toggleBinary(field: string): void {
    const current = this.form.get(field)?.value;
    this.form.get(field)?.setValue(current === 1 ? 0 : 1);
  }

  getBinaryValue(field: string): boolean {
    return this.form.get(field)?.value === 1;
  }

  getSliderValue(field: string): number {
    return this.form.get(field)?.value ?? 0;
  }

  updateSlider(field: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.form.get(field)?.setValue(val);
  }

  submitAssessment(): void {
    this.isLoading = true;

    const caregiverPatientId = this.getCaregiverPatientId();
    const request$ = caregiverPatientId
      ? this.authService.submitAlzheimerAssessmentForPatient<AssessmentResult>(caregiverPatientId, this.form.value)
      : this.authService.submitAlzheimerAssessment<AssessmentResult>(this.form.value);

    request$
      .subscribe({
        next: (result) => {
          this.assessmentResult = result;
          this.isLoading = false;
          // Pin to profile
          //localStorage.setItem('lastAssessmentResult', JSON.stringify(result));
          this.toastr.success('Assessment completed!', '🧠 Results Ready');
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Assessment failed. Please try again.');
          this.isLoading = false;
        }
      });
  }

  requestCaregiverFill(): void {
    this.showIntro = false;
    const user = this.authService.getCurrentUserValue();
    if (!user || user.role !== 'PATIENT') {
      return;
    }

    const caregiverEmails = (user.caregiverEmails || []).filter(Boolean);
    if (!caregiverEmails.length) {
      this.showCaregiverAssociationModal = true;
      return;
    }

    this.notifyCaregiversForAssessment(user, caregiverEmails);
  }

  associateCaregiverAndRequestFill(): void {
    const email = this.caregiverEmail.trim();
    if (!email) {
      this.toastr.error('Enter your caregiver email first.');
      return;
    }

    this.isAssociatingCaregiver = true;
    this.authService.updateProfile({ connectedEmail: email }).subscribe({
      next: () => {
        this.authService.fetchCurrentUser().subscribe({
          next: (user) => {
            this.isAssociatingCaregiver = false;
            this.showCaregiverAssociationModal = false;
            this.feedback.success('Caregiver linked successfully. We will notify them now.', 'Caregiver linked');
            this.sendConnectionNotification(email);
            this.notifyCaregiversForAssessment(user, [email]);
          },
          error: () => {
            this.isAssociatingCaregiver = false;
            this.feedback.warning('Caregiver was linked, but we could not refresh your profile. Please try again.', 'Profile refresh needed');
          },
        });
      },
      error: (error) => {
        this.isAssociatingCaregiver = false;
        const message = error?.error?.message || error?.error || 'That caregiver email was not found.';
        this.feedback.error(message, 'Caregiver not found');
      },
    });
  }

  closeCaregiverAssociationModal(): void {
    if (this.isAssociatingCaregiver) {
      return;
    }
    this.showCaregiverAssociationModal = false;
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

pinToProfile(): void {
  if (!this.assessmentResult) return;
  const user = this.authService.getCurrentUserValue();
  const caregiverPatientId = this.getCaregiverPatientId();
  if (caregiverPatientId) {
    localStorage.setItem(`assessmentResult:${caregiverPatientId.trim().toLowerCase()}`, JSON.stringify(this.assessmentResult));
    this.clearCaregiverAssessmentContext();
  } else if (user) {
    localStorage.setItem(this.assessmentStorageKey(user), JSON.stringify(this.assessmentResult));
  }
  localStorage.removeItem('assessmentResult');
  localStorage.removeItem('showAlzheimerAssessment');
  // Keep showWelcomeFlow so HomeComponent shows welcome popup next
  this.completed.emit(this.assessmentResult);
}

  skip(): void {
  localStorage.removeItem('showAlzheimerAssessment');
  // Keep showWelcomeFlow so HomeComponent shows welcome popup next
  this.skipped.emit();
}

  private notifyCaregiversForAssessment(user: User, caregiverEmails: string[]): void {
    const patientId = (user.userId || user.email || '').trim();
    if (!patientId) {
      this.toastr.error('Your profile is missing a patient id.');
      return;
    }

    this.isRequestingCaregiverFill = true;
    const patientName = user.name || user.email;
    const details = {
      message: `${patientName} asked you to complete their Alzheimer assessment.`,
      patientId,
      patientName,
      patientEmail: user.email,
      returnTo: localStorage.getItem('alzAssessmentReturnTo') === 'profile' ? 'profile' : 'onboarding',
    };

    this.notificationService.sendNotification({
      activityId: `alzheimer-assessment-request:${patientId}`,
      action: 'ALZHEIMER_ASSESSMENT_CAREGIVER_REQUEST',
      details: JSON.stringify(details),
      targetUserIds: caregiverEmails,
    }).subscribe({
      next: () => {
        this.isRequestingCaregiverFill = false;
        this.toastr.success('Your caregiver has been notified.');
        this.feedback.success('Your caregiver has been notified to complete the Alzheimer assessment.', 'Request sent');
        localStorage.removeItem('showAlzheimerAssessment');
        this.caregiverRequested.emit();
      },
      error: () => {
        this.isRequestingCaregiverFill = false;
        this.feedback.error('Could not notify your caregiver. Please try again.', 'Request failed');
      },
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
    const current = this.authService.getCurrentUserValue();
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

  private getCaregiverPatientId(): string {
    return localStorage.getItem('caregiverAlzheimerPatientId')?.trim() || '';
  }

  private isCaregiverPatientMode(): boolean {
    return this.authService.getCurrentUserValue()?.role === 'CAREGIVER' && !!this.getCaregiverPatientId();
  }

  private clearCaregiverAssessmentContext(): void {
    localStorage.removeItem('caregiverAlzheimerPatientId');
    localStorage.removeItem('caregiverAlzheimerPatientEmail');
    localStorage.removeItem('caregiverAlzheimerPatientName');
    localStorage.removeItem('caregiverAlzheimerReturnTo');
  }

  private assessmentStorageKey(user: User): string {
    const identifier = (user.userId || user.email || 'patient').trim().toLowerCase();
    return `assessmentResult:${identifier}`;
  }

  getSeverityColor(level: string): string {
    switch (level?.toLowerCase()) {
      case 'mild': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'severe': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  }

  getRiskColor(level: string): string {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  }


 
}
