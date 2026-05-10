import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService, User, UpdateUserRequest, ChangePasswordRequest, VerificationMethod } from '../login/auth.service';
import { Router } from '@angular/router';
import { FaceService } from '../../services/camera/face.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { COUNTRY_PHONE_CODES, CountryPhoneCode, countryFlag } from '../../../../shared/utils/country-phone-codes';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MedicalRecordService } from '../../../medical-record/services/medical-record.service';
import { AssessmentService } from '../../../medical-record/services/assessment.service';

type NavbarReminderSettingKey =
  | 'activities'
  | 'blogs'
  | 'daily'
  | 'ai'
  | 'patientDaily'
  | 'patientLocation'
  | 'patientAppointments'
  | 'patientMedicalRecords'
  | 'recommendActivities'
  | 'appointments'
  | 'incidentsAlerts'
  | 'monitorPatient'
  | 'patientAlerts';

// Custom validators
function pastDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const date = new Date(`${control.value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { invalidDate: true };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) return { futureDate: true };
  const oldestAllowed = new Date(today);
  oldestAllowed.setFullYear(today.getFullYear() - 120);
  if (date < oldestAllowed) return { tooOld: true };
  return null;
}

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  const phoneRegex = /^\+?[0-9()\-\s]+$/;
  if (!phoneRegex.test(value)) return { invalidPhone: true };
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return { invalidPhoneLength: true };
  if (/^(\d)\1+$/.test(digits)) return { invalidPhone: true };
  return null;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  activeTab: 'personal' | 'settings' = 'personal';
  isEditing = false;
  isChangingPassword = false;
  isLoading = false;
  isCareConnectionLoading = false;
  careConnectionLoadingAction = '';
  careConnectionLoadingName = '';
  careConnectionLoadingDetail = '';
  showAccountDeletedFarewell = false;
  private farewellLogoutTimer: ReturnType<typeof setTimeout> | null = null;
  showPictureMenu = false;
  showProfileUpdatedPopup = false;
  verificationCode = '';
  isSendingVerification = false;
  isVerifyingEmail = false;
  hasSentVerificationCode = false;
  verificationResendCountdown = 0;
  private verificationCountdownTimer: ReturnType<typeof setInterval> | null = null;
  showEmailChangeModal = false;
  pendingEmailChange = '';
  emailChangeVerificationMethod: VerificationMethod = 'phone';
  emailChangeDestinationPhone = '';
  emailChangeDestination = '';
  emailChangeAlternatePhone = '';
  useAlternateEmailChangePhone = false;
  emailChangeCode = '';
  emailChangeStep: 'send' | 'code' | 'success' = 'send';
  isSendingEmailChangeCode = false;
  isConfirmingEmailChange = false;
  emailChangeCountdown = 0;
  private emailChangeCountdownTimer: ReturnType<typeof setInterval> | null = null;
  selectedFile: File | null = null;
  imageChangedEvent: Event | null = null;
  croppedImageBlob: Blob | null = null;
  showCropper = false;
  private profilePopupTimeout: ReturnType<typeof setTimeout> | null = null;

  user: User | null = null;
  private userSub!: Subscription;

  personalForm: FormGroup;
  passwordData = { currentPassword: '', newPassword: '' };
  passwordResetStep: 'email' | 'code' | 'password' | 'success' = 'email';
  passwordResetCode = '';
  passwordResetNewPassword = '';
  passwordResetConfirmPassword = '';
  passwordResetCountdown = 0;
  isPasswordResetBusy = false;
  private passwordResetTimer: ReturnType<typeof setInterval> | null = null;
  recoveryEmailDraft = '';
  isSavingRecoveryEmail = false;
  isEditingRecoveryEmail = false;
  notificationSettings = {
    activities: true,
    blogs: true,
    daily: true,
    ai: true,
    patientDaily: true,
    patientLocation: true,
    patientAppointments: true,
    patientMedicalRecords: true,
    recommendActivities: true,
    appointments: true,
    incidentsAlerts: true,
    monitorPatient: true,
    patientAlerts: true,
  };
  readonly maxBirthDate = new Date().toISOString().split('T')[0];
  readonly minBirthDate = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 120);
    return date.toISOString().split('T')[0];
  })();

  hasFaceId = false;

  // Country codes
  countries = [
    { code: '+1', flag: '🇺🇸', name: 'USA' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+33', flag: '🇫🇷', name: 'France' },
    { code: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: '+39', flag: '🇮🇹', name: 'Italy' },
    { code: '+34', flag: '🇪🇸', name: 'Spain' },
    { code: '+81', flag: '🇯🇵', name: 'Japan' },
    { code: '+86', flag: '🇨🇳', name: 'China' },
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+55', flag: '🇧🇷', name: 'Brazil' },
    { code: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: '+7', flag: '🇷🇺', name: 'Russia' },
    { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  ];
  phoneCountryCode = '+1';
  emergencyCountryCode = '+1';
  countryOptions = COUNTRY_PHONE_CODES;
  phoneCountrySearch = '';
  emergencyCountrySearch = '';
  countrySearch = '';
  showPhoneCountryDropdown = false;
  showEmergencyCountryDropdown = false;
  showCountryDropdown = false;
  selectedCountryIso = 'US';

  // Role‑specific connected users (full User objects)
  caregivers: User[] = [];
  patients: User[] = [];
  assignedDoctor: User | null = null;

  // Modal states
  showDoctorSearch = false;
  showCaregiverSearch = false;      // for patients adding caregivers
  showPatientSearch = false;         // for caregivers adding patients
  showRelationshipModal = false;
  pendingRelationshipUser: User | null = null;
  pendingRelationshipRole: 'CAREGIVER' | 'PATIENT' | null = null;
  selectedRelationshipType = '';
  relationshipModalMode: 'create' | 'edit' = 'create';
  readonly relationshipOptions = [
    'Spouse',
    'Parent',
    'Child',
    'Sibling',
    'Grandparent',
    'Grandchild',
    'Aunt / Uncle',
    'Cousin',
    'Friend',
    'Neighbor',
    'Professional caregiver',
  ];
  selectedPatientInfo: User | null = null;
  caregiverPatientMedicalStatus: Record<string, { loading: boolean; record: any | null; latestAssessment: any | null; alzheimerAssessment: any | null }> = {};
  assessmentResult: any = null;   // stores the saved result

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
    private feedback: AppFeedbackService,
     public router: Router,       // ← add
    private faceService: FaceService,  // ← add
    private medicalRecordService: MedicalRecordService,
    private assessmentService: AssessmentService,
    private notificationService: NotificationService
  ) {
    this.personalForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      recoveryEmail: ['', [Validators.email]],
      phone: ['', [Validators.required, phoneValidator]],
      country: ['United States'],
      address: [''],
      dateOfBirth: ['', [Validators.required, pastDateValidator]],
      age: [{ value: '', disabled: true }],
      emergencyContact: ['', [Validators.required, phoneValidator]],
      yearsExperience: [''],
      specialization: [''],
      medicalLicense: [''],
      workplaceType: [''],
      workplaceName: [''],
    });
  }

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;
      if (user) {
        this.populateForm();
        this.applyRoleValidators(user.role);
        this.loadNotificationSettings();
        this.loadConnectedUsers();
        this.loadAssessmentResult(user);
      } else {
        this.assessmentResult = null;
      }
      
    });

    // ← add this
  this.faceService.hasFaceId().subscribe({
    next: (res) => this.hasFaceId = res.hasFaceId,
    error: () => this.hasFaceId = false
  });

  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
    if (this.profilePopupTimeout) clearTimeout(this.profilePopupTimeout);
    if (this.farewellLogoutTimer) clearTimeout(this.farewellLogoutTimer);
    this.clearVerificationCountdown();
    this.clearPasswordResetCountdown();
    this.clearEmailChangeCountdown();
  }

  get selectedPhoneCountry(): CountryPhoneCode {
    return this.countryOptions.find(country => country.dialCode === this.phoneCountryCode && country.iso2 === 'US') ||
      this.countryOptions.find(country => country.dialCode === this.phoneCountryCode) ||
      this.countryOptions[0];
  }

  get selectedEmergencyCountry(): CountryPhoneCode {
    return this.countryOptions.find(country => country.dialCode === this.emergencyCountryCode && country.iso2 === 'US') ||
      this.countryOptions.find(country => country.dialCode === this.emergencyCountryCode) ||
      this.countryOptions[0];
  }

  get filteredPhoneCountries(): CountryPhoneCode[] {
    return this.filterCountries(this.phoneCountrySearch);
  }

  get filteredEmergencyCountries(): CountryPhoneCode[] {
    return this.filterCountries(this.emergencyCountrySearch);
  }

  get filteredProfileCountries(): CountryPhoneCode[] {
    return this.filterCountries(this.countrySearch);
  }

  get selectedProfileCountry(): CountryPhoneCode {
    return this.countryOptions.find(country => country.iso2 === this.selectedCountryIso) || this.countryOptions[0];
  }

  get phoneMaxLength(): number {
    return this.localPhoneMaxLength(this.phoneCountryCode);
  }

  get emergencyPhoneMaxLength(): number {
    return this.localPhoneMaxLength(this.emergencyCountryCode);
  }

  get profileAge(): number | null {
    return this.calculateAge(this.personalForm.get('dateOfBirth')?.value || this.user?.dateOfBirth);
  }

  flagFor(country: CountryPhoneCode): string {
    return countryFlag(country.iso2);
  }

  getSeverityColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'mild':     return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'severe':   return 'text-red-600 bg-red-50 border-red-200';
    default:         return 'text-green-600 bg-green-50 border-green-200';
  }
}

getRiskColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'low':      return 'text-green-600 bg-green-50 border-green-200';
    case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'high':     return 'text-red-600 bg-red-50 border-red-200';
    default:         return 'text-gray-600 bg-gray-50';
  }
}

retakeAssessment(): void {
  if (this.user) {
    localStorage.removeItem(this.assessmentStorageKey(this.user));
  }
  localStorage.setItem('showAlzheimerAssessment', 'true');
  localStorage.removeItem('showWelcomeFlow');
  localStorage.setItem('alzAssessmentReturnTo', 'profile');
  this.router.navigate(['/']);
}

  private populateForm(): void {
    if (!this.user) return;
    const normalizedBirthDate = this.normalizeDateForInput(this.user.dateOfBirth);
    this.personalForm.patchValue({
      name: this.user.name,
      email: this.user.email,
      recoveryEmail: this.user.recoveryEmail || '',
      phone: this.stripKnownCountryCode(this.user.phone, 'phone') || '',
      country: this.user.country || 'United States',
      address: this.user.address || '',
      dateOfBirth: normalizedBirthDate,
      age: this.calculateAge(normalizedBirthDate) ?? '',
      emergencyContact: this.stripKnownCountryCode(this.user.emergencyContact, 'emergency') || '',
      yearsExperience: this.user.yearsExperience,
      specialization: this.user.specialization,
      medicalLicense: this.user.medicalLicense,
      workplaceType: this.user.workplaceType,
      workplaceName: this.user.workplaceName,
    });
    this.selectedCountryIso = this.findCountryIso(this.user.country) || 'US';
    this.recoveryEmailDraft = this.user.recoveryEmail || '';
    this.isEditingRecoveryEmail = !this.user.recoveryEmail;
    this.applyRoleValidators(this.user.role);
  }

  private applyRoleValidators(role?: string): void {
    const emergencyContact = this.personalForm.get('emergencyContact');
    if (!emergencyContact) return;

    if (role === 'PATIENT' || role === 'CAREGIVER') {
      emergencyContact.setValidators([Validators.required, phoneValidator]);
    } else {
      emergencyContact.clearValidators();
    }
    emergencyContact.updateValueAndValidity({ emitEvent: false });
  }

  private loadConnectedUsers(): void {
    if (!this.user) return;

    const fetchUser = (email: string) => 
      this.authService.getUserByEmail(email).pipe(
        catchError(() => of(null))
      );

    if (this.user.role === 'PATIENT') {
      // Caregivers
      const caregiverEmails = this.user.caregiverEmails || [];
      if (caregiverEmails.length) {
        forkJoin(caregiverEmails.map(email => fetchUser(email))).subscribe(users => {
          this.caregivers = this.onlyResolvedUsers(users);
        });
      } else {
        this.caregivers = [];
      }

      // Doctor
      const firstDoctorEmail = this.user.doctorEmail || this.user.doctorEmails?.[0];
      if (firstDoctorEmail) {
        fetchUser(firstDoctorEmail).subscribe(doctor => {
          this.assignedDoctor = doctor;
        });
      } else {
        this.assignedDoctor = null;
      }
    } else if (this.user.role === 'CAREGIVER') {
      const patientEmails = this.user.patientEmails || [];
      if (patientEmails.length) {
        forkJoin(patientEmails.map(email => fetchUser(email))).subscribe(users => {
          this.patients = this.onlyResolvedUsers(users);
        });
      } else {
        this.patients = [];
      }
    } else if (this.user.role === 'DOCTOR') {
      const patientEmails = this.user.patientEmails || [];
      if (patientEmails.length) {
        forkJoin(patientEmails.map(email => fetchUser(email))).subscribe(users => {
          this.patients = this.onlyResolvedUsers(users);
        });
      } else {
        this.patients = [];
      }
    }
  }

  private onlyResolvedUsers(users: Array<User | null>): User[] {
    return users.filter((user): user is User => !!user);
  }

  setTab(tab: 'personal' | 'settings'): void {
    this.activeTab = tab;
    if (tab === 'settings') {
      setTimeout(() => this.scrollToSettingsSection(), 0);
    } else {
      this.isChangingPassword = false;
    }
  }

  toggleEdit(): void {
    if (this.isEditing) this.handleSaveProfile();
    else {
      this.activeTab = 'personal';
      this.isEditing = true;
      setTimeout(() => this.scrollToPersonalInfoSection(), 80);
    }
  }

  handleSaveProfile(): void {
    if (!this.user) return;

    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      this.toastr.warning('Please fix the errors in the form');
      return;
    }

    const formValue = this.personalForm.value;
    const requestedEmail = String(formValue.email || '').trim().toLowerCase();
    const currentEmail = String(this.user.email || '').trim().toLowerCase();
    const emailChanged = requestedEmail && requestedEmail !== currentEmail;
    const updateData: UpdateUserRequest = {
      name: formValue.name,
      recoveryEmail: formValue.recoveryEmail || '',
      phone: this.composePhoneNumber(this.phoneCountryCode, formValue.phone),
      country: formValue.country || this.selectedProfileCountry.name,
      address: formValue.address,
      dateOfBirth: formValue.dateOfBirth,
    };

    if (this.user.role === 'PATIENT' || this.user.role === 'CAREGIVER') {
      updateData.emergencyContact = this.composePhoneNumber(this.emergencyCountryCode, formValue.emergencyContact);
    }

    if (this.user.role === 'DOCTOR') {
      updateData.yearsExperience = formValue.yearsExperience;
      updateData.specialization = formValue.specialization;
      updateData.medicalLicense = formValue.medicalLicense;
      updateData.workplaceType = formValue.workplaceType;
      updateData.workplaceName = formValue.workplaceName;
    }

    this.isLoading = true;
    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.feedback.success('Your profile details were saved.', 'Profile updated');
        this.isEditing = false;
        this.isLoading = false;
        this.showProfileUpdatedNotice();
        if (response.token) localStorage.setItem('auth_token', response.token);
        if (response.user) this.authService.fetchCurrentUser().subscribe();
        if (emailChanged) {
          this.openEmailChangeFlow(requestedEmail);
        }
      },
      error: (err) => {
        if (err?.status === 401) {
          this.feedback.error('Your session expired. Please log in again.', 'Session expired');
        } else {
          console.error(err);
          this.feedback.error(this.extractProfileError(err), 'Profile update failed');
        }
        this.isLoading = false;
      }
    });
  }

  private extractProfileError(err: any): string {
    const message = err?.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (typeof err?.error === 'string' && err.error.trim()) return err.error;
    return 'Failed to update profile';
  }

  saveRecoveryEmail(): void {
    if (!this.user || this.isSavingRecoveryEmail) return;
    const recoveryEmail = this.recoveryEmailDraft.trim().toLowerCase();
    if (recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      this.feedback.error('Enter a valid recovery email address.', 'Recovery email');
      return;
    }
    if (recoveryEmail && recoveryEmail === this.user.email.toLowerCase()) {
      this.feedback.error('Recovery email must be different from your account email.', 'Recovery email');
      return;
    }

    this.isSavingRecoveryEmail = true;
    this.authService.updateProfile({ recoveryEmail }).subscribe({
      next: () => {
        this.feedback.success(recoveryEmail ? 'Your recovery email was saved.' : 'Your recovery email was removed.', 'Security updated');
        this.isEditingRecoveryEmail = !recoveryEmail;
        this.isSavingRecoveryEmail = false;
        this.authService.fetchCurrentUser().subscribe();
      },
      error: (err) => {
        this.feedback.error(this.extractProfileError(err) || 'Could not save recovery email.', 'Recovery email failed');
        this.isSavingRecoveryEmail = false;
      }
    });
  }

  editRecoveryEmail(): void {
    this.recoveryEmailDraft = this.user?.recoveryEmail || '';
    this.isEditingRecoveryEmail = true;
  }

  cancelRecoveryEmailEdit(): void {
    this.recoveryEmailDraft = this.user?.recoveryEmail || '';
    this.isEditingRecoveryEmail = !this.user?.recoveryEmail;
  }

  deleteRecoveryEmail(): void {
    this.recoveryEmailDraft = '';
    this.saveRecoveryEmail();
  }

  get notificationSettingOptions(): Array<{ key: NavbarReminderSettingKey; label: string }> {
    const role = (this.user?.role || '').toUpperCase();

    if (role === 'DOCTOR') {
      return [
        { key: 'patientDaily', label: 'Patient daily emotion reminders' },
        { key: 'appointments', label: 'Appointment reminders' },
        { key: 'patientMedicalRecords', label: 'Patient medical record reminders' },
        { key: 'recommendActivities', label: 'Recommend activities reminders' },
        { key: 'patientAlerts', label: 'Patient incidents and alerts reminders' },
        { key: 'ai', label: 'EverCare AI assistant reminders' },
      ];
    }

    if (role === 'CAREGIVER') {
      return [
        { key: 'patientDaily', label: 'Patient daily emotion reminders' },
        { key: 'patientLocation', label: 'Patient location reminders' },
        { key: 'patientAppointments', label: 'Patient appointment reminders' },
        { key: 'patientMedicalRecords', label: 'Patient medical record reminders' },
        { key: 'activities', label: 'Patient activity reminders' },
        { key: 'incidentsAlerts', label: 'Incident and alert reminders' },
        { key: 'monitorPatient', label: 'Monitor your patient reminders' },
        { key: 'ai', label: 'EverCare AI assistant reminders' },
      ];
    }

    return [
      { key: 'activities', label: "Check today's activities" },
      { key: 'blogs', label: 'Check blogs' },
      { key: 'daily', label: 'Daily Me entry reminders' },
      { key: 'incidentsAlerts', label: 'Incident and alert reminders' },
      { key: 'ai', label: 'EverCare AI assistant reminders' },
    ];
  }

  toggleNotificationSetting(key: NavbarReminderSettingKey): void {
    this.notificationSettings = { ...this.notificationSettings, [key]: !this.notificationSettings[key] };
    this.saveNotificationSettings();
    this.feedback.success('Your notification preference was updated.', 'Notifications');
  }

  private loadNotificationSettings(): void {
    if (typeof localStorage === 'undefined' || !this.user) return;
    const saved = localStorage.getItem(this.notificationSettingsStorageKey());
    const defaults = this.defaultNotificationSettings();
    if (!saved) {
      this.notificationSettings = defaults;
      return;
    }
    try {
      this.notificationSettings = {
        ...defaults,
        ...JSON.parse(saved),
      };
    } catch {
      this.notificationSettings = defaults;
    }
  }

  private defaultNotificationSettings(): Record<NavbarReminderSettingKey, boolean> {
    return {
      activities: true,
      blogs: true,
      daily: true,
      ai: true,
      patientDaily: true,
      patientLocation: true,
      patientAppointments: true,
      patientMedicalRecords: true,
      recommendActivities: true,
      appointments: true,
      incidentsAlerts: true,
      monitorPatient: true,
      patientAlerts: true,
    };
  }

  private saveNotificationSettings(): void {
    if (typeof localStorage === 'undefined' || !this.user) return;
    localStorage.setItem(this.notificationSettingsStorageKey(), JSON.stringify(this.notificationSettings));
  }

  private notificationSettingsStorageKey(): string {
    const id = this.user?.userId || this.user?.email || 'guest';
    return `evercare_nav_reminder_settings_${id}`;
  }

  toggleChangePassword(): void {
    this.isChangingPassword = !this.isChangingPassword;
    this.passwordData = { currentPassword: '', newPassword: '' };
    this.resetPasswordResetState();
  }

  handleChangePassword(): void {
    if (!this.passwordData.currentPassword || !this.passwordData.newPassword) {
      this.toastr.warning('Fill all fields');
      return;
    }
    this.isLoading = true;
    const request: ChangePasswordRequest = {
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    };
    this.authService.changePassword(request).subscribe({
      next: () => {
        this.toastr.success('Password changed');
        this.isChangingPassword = false;
        this.isLoading = false;
        this.passwordData = { currentPassword: '', newPassword: '' };
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Password change failed');
        this.isLoading = false;
      }
    });
  }

  // Profile picture methods
  togglePictureMenu(): void {
    this.showPictureMenu = !this.showPictureMenu;
  }
  triggerFileInput(): void {
    document.getElementById('profile-picture-input')?.click();
  }
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imageChangedEvent = event;
      this.croppedImageBlob = null;
      this.showCropper = true;
    }
  }

  imageCropped(event: ImageCroppedEvent): void {
    this.croppedImageBlob = event.blob || null;
  }

  cancelCrop(): void {
    this.showCropper = false;
    this.imageChangedEvent = null;
    this.croppedImageBlob = null;
    this.selectedFile = null;
  }

  confirmCrop(): void {
    if (!this.croppedImageBlob) {
      this.toastr.warning('Please crop the image first');
      return;
    }

    const originalFile = (this.imageChangedEvent as any)?.target?.files?.[0];
    const fileType = originalFile?.type || 'image/png';
    const fileName = originalFile?.name || 'profile-picture.png';
    this.selectedFile = new File([this.croppedImageBlob], fileName, { type: fileType });
    this.showCropper = false;
    this.imageChangedEvent = null;
    this.croppedImageBlob = null;
    this.uploadPicture();
  }

  uploadPicture(): void {
    if (!this.selectedFile) return;
    this.isLoading = true;
    this.authService.uploadProfilePicture(this.selectedFile).subscribe({
      next: (response) => {
        this.toastr.success('Profile picture updated');
        if (this.user) this.user.profilePicture = response.profilePicture;
        this.authService.fetchCurrentUser().subscribe();
        this.isLoading = false;
        this.showPictureMenu = false;
        this.selectedFile = null;
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Upload failed');
        this.isLoading = false;
      }
    });
  }
  removePicture(): void {
    this.isLoading = true;
    this.authService.removeProfilePicture().subscribe({
      next: () => {
        this.toastr.success('Profile picture removed');
        if (this.user) this.user.profilePicture = undefined;
        this.authService.fetchCurrentUser().subscribe();
        this.isLoading = false;
        this.showPictureMenu = false;
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Remove failed');
        this.isLoading = false;
      }
    });
  }

  // Account deletion
  async confirmDeleteAccount(): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Delete your account?',
      message: 'This cannot be undone and will remove your EverCare account.',
      confirmText: 'Delete account',
      tone: 'danger'
    });
    if (confirmed) this.deleteAccount();
  }
  private deleteAccount(): void {
    this.isLoading = true;
    this.authService.deleteAccount().subscribe({
      next: () => {
        this.isLoading = false;
        this.showAccountDeletedFarewell = true;
        this.farewellLogoutTimer = setTimeout(() => {
          this.authService.logout();
        }, 3200);
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Delete failed');
        this.isLoading = false;
      }
    });
  }

  // ========== Care connection methods ==========
  onDoctorSelected(doctor: User): void {
    const updateData: UpdateUserRequest = { doctorEmail: doctor.email };
    this.startCareConnectionLoading(
      'Associating doctor',
      doctor.name || doctor.email || 'your doctor',
      'EverCare is updating your care team and notifying the selected doctor.'
    );
    this.authService.updateProfile(updateData).subscribe({
      next: () => {
        this.toastr.success(`Dr. ${doctor.name} added to your care team`);
        this.authService.fetchCurrentUser().subscribe();
        this.stopCareConnectionLoading();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to associate doctor');
        this.stopCareConnectionLoading();
      }
    });
  }

  // For patients adding caregivers
  onCaregiverSelected(caregiver: User): void {
    this.openRelationshipModal(caregiver, 'CAREGIVER');
  }

  private associateCaregiver(caregiver: User, relationshipType: string): void {
    const updateData: UpdateUserRequest = { connectedEmail: caregiver.email, relationshipType };
    this.startCareConnectionLoading(
      'Associating caregiver',
      caregiver.name || caregiver.email || 'your caregiver',
      'EverCare is linking this caregiver to your profile and sending the care update.'
    );
    this.authService.updateProfile(updateData).subscribe({
      next: () => {
        this.toastr.success(`Caregiver ${caregiver.name} added`);
        this.authService.fetchCurrentUser().subscribe();
        this.stopCareConnectionLoading();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to associate caregiver');
        this.stopCareConnectionLoading();
      }
    });
  }

  // For caregivers adding patients
  onPatientSelected(patient: User): void {
    this.openRelationshipModal(patient, 'PATIENT');
  }

  private associatePatient(patient: User, relationshipType: string): void {
    const updateData: UpdateUserRequest = { connectedEmail: patient.email, relationshipType };
    this.startCareConnectionLoading(
      'Associating patient',
      patient.name || patient.email || 'your patient',
      'EverCare is linking this patient to your caregiver profile.'
    );
    this.authService.updateProfile(updateData).subscribe({
      next: () => {
        this.toastr.success(`Patient ${patient.name} added`);
        this.authService.fetchCurrentUser().subscribe();
        this.stopCareConnectionLoading();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to associate patient');
        this.stopCareConnectionLoading();
      }
    });
  }

  openRelationshipModal(user: User, role: 'CAREGIVER' | 'PATIENT'): void {
    this.pendingRelationshipUser = user;
    this.pendingRelationshipRole = role;
    this.selectedRelationshipType = '';
    this.relationshipModalMode = 'create';
    this.showRelationshipModal = true;
  }

  openRelationshipEditor(user: User, role: 'CAREGIVER' | 'PATIENT'): void {
    this.pendingRelationshipUser = user;
    this.pendingRelationshipRole = role;
    this.selectedRelationshipType = this.getRelationshipLabel(user, role === 'CAREGIVER' ? 'caregiver' : 'patient');
    this.relationshipModalMode = 'edit';
    this.showRelationshipModal = true;
  }

  closeRelationshipModal(): void {
    this.showRelationshipModal = false;
    this.pendingRelationshipUser = null;
    this.pendingRelationshipRole = null;
    this.selectedRelationshipType = '';
    this.relationshipModalMode = 'create';
  }

  confirmRelationshipSelection(preferNotToSay = false): void {
    if (!this.pendingRelationshipUser || !this.pendingRelationshipRole) return;
    const relationshipType = preferNotToSay ? 'Prefer not to say' : this.selectedRelationshipType;
    if (!relationshipType) {
      this.feedback.warning('Choose the relationship type, or select prefer not to say.', 'Relationship');
      return;
    }

    const selectedUser = this.pendingRelationshipUser;
    const selectedRole = this.pendingRelationshipRole;
    this.closeRelationshipModal();

    if (this.relationshipModalMode === 'edit') {
      this.updateRelationshipType(selectedUser, relationshipType);
    } else if (selectedRole === 'CAREGIVER') {
      this.associateCaregiver(selectedUser, relationshipType);
    } else {
      this.associatePatient(selectedUser, relationshipType);
    }
  }

  clearRelationshipSelection(): void {
    if (!this.pendingRelationshipUser || !this.pendingRelationshipRole) return;
    const selectedUser = this.pendingRelationshipUser;
    this.closeRelationshipModal();
    this.updateRelationshipType(selectedUser, '__CLEAR_RELATIONSHIP__');
  }

  private updateRelationshipType(user: User, relationshipType: string): void {
    const updateData: UpdateUserRequest = { connectedEmail: user.email, relationshipType };
    const clearing = relationshipType === '__CLEAR_RELATIONSHIP__';
    this.startCareConnectionLoading(
      clearing ? 'Clearing relationship' : 'Updating relationship',
      user.name || user.email || 'this connection',
      clearing ? 'EverCare is removing only the relationship label.' : 'EverCare is saving the updated relationship label.'
    );
    this.authService.updateProfile(updateData).subscribe({
      next: () => {
        this.feedback.success(clearing ? 'Relationship label removed.' : 'Relationship label updated.', 'Relationship');
        this.authService.fetchCurrentUser().subscribe();
        this.stopCareConnectionLoading();
      },
      error: (err) => {
        console.error(err);
        this.feedback.error('Could not update the relationship label.', 'Relationship');
        this.stopCareConnectionLoading();
      }
    });
  }

  getRelationshipLabel(user: User, kind: 'caregiver' | 'patient'): string {
    const email = (user.email || '').trim().toLowerCase();
    const relationships = kind === 'caregiver'
      ? this.user?.caregiverRelationships
      : this.user?.patientRelationships;
    return relationships?.[email] || '';
  }

  relationshipIconPath(label: string): string {
    const value = (label || '').toLowerCase();
    if (value.includes('spouse')) return 'M12 21s-7-4.4-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 11c0 5.6-7 10-7 10Z';
    if (value.includes('parent')) return 'M6 20v-1.2A4.8 4.8 0 0 1 10.8 14h2.4A4.8 4.8 0 0 1 18 18.8V20M9 8a3 3 0 1 0 6 0 3 3 0 0 0-6 0M4 12h4M16 12h4';
    if (value.includes('child')) return 'M8 20v-1a4 4 0 0 1 8 0v1M9.5 9.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0M5 6h14M7 6v4M17 6v4';
    if (value.includes('sibling')) return 'M4 20v-1a4 4 0 0 1 4-4h1M15 15h1a4 4 0 0 1 4 4v1M7 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0M11 12a3 3 0 1 0 6 0';
    if (value.includes('grand')) return 'M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0M9 4c1 1.4 5 1.4 6 0';
    if (value.includes('aunt') || value.includes('uncle') || value.includes('cousin')) return 'M12 3 20 8v8l-8 5-8-5V8l8-5ZM8 11h8M9 15h6';
    if (value.includes('friend') || value.includes('neighbor')) return 'M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a4 4 0 0 1 8 0M13 20a4 4 0 0 1 8 0';
    if (value.includes('professional')) return 'M4 8h16v11H4V8ZM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M12 11v5M9.5 13.5h5';
    return 'M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11ZM9.5 10.5h5';
  }

 removeConnection(user: User): void {
  let updateData: UpdateUserRequest = {};
  const roleLabel = this.formatRoleLabel(user.role);
  if (user.role === 'DOCTOR') {
    // Send the same email to toggle (backend will clear if it's the same)
    updateData.doctorEmail = user.email;
  } else {
    // For caregiver/patient, send the email to toggle
    updateData.connectedEmail = user.email;
  }
  this.startCareConnectionLoading(
    `Removing ${roleLabel}`,
    user.name || user.email || `this ${roleLabel}`,
    'EverCare is updating care permissions and notifying the affected user.'
  );
  this.authService.updateProfile(updateData).subscribe({
    next: () => {
      this.toastr.info(`${user.role} removed`);
      this.authService.fetchCurrentUser().subscribe();
      this.stopCareConnectionLoading();
    },
    error: (err) => {
      console.error(err);
      this.toastr.error('Failed to remove connection');
      this.stopCareConnectionLoading();
    }
  });
}

  private startCareConnectionLoading(action: string, name: string, detail: string): void {
    this.isCareConnectionLoading = true;
    this.careConnectionLoadingAction = action;
    this.careConnectionLoadingName = name;
    this.careConnectionLoadingDetail = detail;
  }

  private stopCareConnectionLoading(): void {
    this.isCareConnectionLoading = false;
    this.careConnectionLoadingAction = '';
    this.careConnectionLoadingName = '';
    this.careConnectionLoadingDetail = '';
  }

  private formatRoleLabel(role?: string): string {
    return (role || 'connection').toLowerCase().replace(/_/g, ' ');
  }

  // Helpers
  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  isInvalid(controlName: string): boolean {
    const ctrl = this.personalForm.get(controlName);
    return ctrl ? ctrl.invalid && ctrl.touched : false;
  }

  getPhoneError(controlName: 'phone' | 'emergencyContact'): string {
    const control = this.personalForm.get(controlName);
    if (!control?.errors) return '';
    if (control.errors['required']) return 'Required.';
    if (control.errors['invalidPhoneLength']) return 'Use 8 to 15 digits.';
    return 'Use a valid phone number.';
  }

  getDateOfBirthError(): string {
    const control = this.personalForm.get('dateOfBirth');
    if (!control?.errors) return '';
    if (control.errors['required']) return 'Required.';
    if (control.errors['futureDate']) return 'Must be in the past.';
    if (control.errors['tooOld']) return 'Please enter a realistic date.';
    return 'Invalid date.';
  }

  private normalizeDateForInput(value: unknown): string {
    if (!value) return '';

    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day] = value;
      return [
        String(year).padStart(4, '0'),
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0')
      ].join('-');
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateOnly) return dateOnly[1];

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }

    return '';
  }

  private stripKnownCountryCode(value: string | undefined, target: 'phone' | 'emergency'): string {
    const raw = value?.trim() ?? '';
    if (!raw.startsWith('+')) return raw;

    const sortedCountries = [...this.countryOptions].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const match = sortedCountries.find(country => raw.startsWith(country.dialCode));
    if (!match) return raw;

    if (target === 'phone') {
      this.phoneCountryCode = match.dialCode;
    } else {
      this.emergencyCountryCode = match.dialCode;
    }

    return raw.slice(match.dialCode.length).trim();
  }

  private composePhoneNumber(countryCode: string, value: string): string {
    const phone = String(value ?? '').trim();
    if (!phone) return '';
    return phone.startsWith('+') ? phone : `${countryCode} ${phone}`;
  }

  onDateOfBirthChange(): void {
    this.personalForm.get('age')?.setValue(this.profileAge ?? '');
  }

  selectCountry(country: CountryPhoneCode, target: 'phone' | 'emergency'): void {
    if (target === 'phone') {
      this.phoneCountryCode = country.dialCode;
      this.phoneCountrySearch = '';
      this.showPhoneCountryDropdown = false;
    } else {
      this.emergencyCountryCode = country.dialCode;
      this.emergencyCountrySearch = '';
      this.showEmergencyCountryDropdown = false;
    }
  }

  selectProfileCountry(country: CountryPhoneCode): void {
    this.selectedCountryIso = country.iso2;
    this.countrySearch = '';
    this.showCountryDropdown = false;
    this.personalForm.get('country')?.setValue(country.name);
  }

  trimPhoneInput(controlName: 'phone' | 'emergencyContact', maxLength: number): void {
    const control = this.personalForm.get(controlName);
    const digits = String(control?.value ?? '').replace(/\D/g, '').slice(0, maxLength);
    if (control?.value !== digits) {
      control?.setValue(digits, { emitEvent: false });
    }
  }

  private filterCountries(search: string): CountryPhoneCode[] {
    const query = search.trim().toLowerCase();
    if (!query) return this.countryOptions;

    return this.countryOptions.filter(country =>
      country.name.toLowerCase().startsWith(query) ||
      country.name.toLowerCase().includes(query) ||
      country.dialCode.includes(query) ||
      country.iso2.toLowerCase().startsWith(query)
    );
  }

  private calculateAge(value: unknown): number | null {
    const normalized = this.normalizeDateForInput(value);
    if (!normalized) return null;
    const birthDate = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  private localPhoneMaxLength(countryCode: string): number {
    const dialDigits = countryCode.replace(/\D/g, '').length;
    return Math.max(4, 15 - dialDigits);
  }

  private findCountryIso(countryName?: string): string | null {
    if (!countryName) return null;
    const normalized = countryName.trim().toLowerCase();
    return this.countryOptions.find(country =>
      country.name.toLowerCase() === normalized || country.iso2.toLowerCase() === normalized
    )?.iso2 || null;
  }

  get needsEmailVerification(): boolean {
    return !!this.user && this.user.role !== 'ADMIN' && !this.user.isVerified;
  }

  sendVerificationCode(): void {
    if (this.isSendingVerification || !this.needsEmailVerification || this.verificationResendCountdown > 0) return;
    this.isSendingVerification = true;
    this.authService.sendEmailVerificationCode().subscribe({
      next: () => {
        this.hasSentVerificationCode = true;
        this.startVerificationCountdown();
        this.feedback.success('Verification code sent to your email.', 'Code sent');
        this.isSendingVerification = false;
      },
      error: (err) => {
        this.feedback.error(this.extractProfileError(err) || 'Could not send verification code.', 'Verification failed');
        this.isSendingVerification = false;
      }
    });
  }

  verifyEmailCode(): void {
    const code = this.verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      this.feedback.warning('Enter the 6-digit code from your email.', 'Verification code');
      return;
    }
    this.isVerifyingEmail = true;
    this.authService.verifyEmailCode(code).subscribe({
      next: () => {
        this.verificationCode = '';
        this.feedback.success('Your email is verified.', 'Email verified');
        this.isVerifyingEmail = false;
      },
      error: (err) => {
        this.feedback.error(this.extractProfileError(err) || 'Verification failed.', 'Verification failed');
        this.isVerifyingEmail = false;
      }
    });
  }

  private startVerificationCountdown(): void {
    this.clearVerificationCountdown();
    this.verificationResendCountdown = 60;
    this.verificationCountdownTimer = setInterval(() => {
      this.verificationResendCountdown = Math.max(0, this.verificationResendCountdown - 1);
      if (this.verificationResendCountdown === 0) this.clearVerificationCountdown();
    }, 1000);
  }

  private clearVerificationCountdown(): void {
    if (this.verificationCountdownTimer) {
      clearInterval(this.verificationCountdownTimer);
      this.verificationCountdownTimer = null;
    }
  }

  openEmailChangeFlow(newEmail?: string): void {
    const currentUser = this.user;
    this.pendingEmailChange = (newEmail || this.personalForm.get('email')?.value || '').trim().toLowerCase();
    if (!this.pendingEmailChange || this.personalForm.get('email')?.invalid) {
      this.feedback.error('Enter a valid new email address first.', 'Email change');
      return;
    }
    if (!currentUser) {
      this.feedback.error('Please sign in again before changing your email.', 'Email change');
      return;
    }
    if (this.pendingEmailChange === currentUser.email.toLowerCase()) {
      this.feedback.info('This is already your current email address.', 'Email unchanged');
      return;
    }
    this.emailChangeVerificationMethod = currentUser.phone ? 'phone' : 'email';
    this.emailChangeDestinationPhone = currentUser.phone || '';
    this.emailChangeDestination = this.emailChangeDestinationPhone || currentUser.email || '';
    this.emailChangeAlternatePhone = '';
    this.useAlternateEmailChangePhone = !this.emailChangeDestinationPhone;
    this.emailChangeCode = '';
    this.emailChangeStep = 'send';
    this.showEmailChangeModal = true;
  }

  closeEmailChangeModal(): void {
    if (this.isSendingEmailChangeCode || this.isConfirmingEmailChange) return;
    this.showEmailChangeModal = false;
    this.emailChangeCode = '';
  }

  get emailChangePhoneTarget(): string {
    return this.useAlternateEmailChangePhone
      ? this.emailChangeAlternatePhone.trim()
      : (this.emailChangeDestinationPhone || this.user?.phone || '').trim();
  }

  get effectiveRecoveryEmail(): string {
    const manualRecovery = (this.user?.recoveryEmail || '').trim();
    if (manualRecovery) return manualRecovery;
    return this.user?.role === 'PATIENT' ? (this.user?.caregiverEmails?.[0] || '').trim() : '';
  }

  get emailChangeDestinationLabel(): string {
    if (this.emailChangeVerificationMethod === 'phone') {
      return this.emailChangeDestinationPhone || this.emailChangePhoneTarget || 'Choose a phone number';
    }
    if (this.emailChangeVerificationMethod === 'recovery-email') {
      return this.emailChangeDestination || this.effectiveRecoveryEmail || 'No recovery email set';
    }
    return this.emailChangeDestination || this.user?.email || 'Account email';
  }

  selectEmailChangeMethod(method: VerificationMethod): void {
    this.emailChangeVerificationMethod = method;
    this.emailChangeCode = '';
    this.emailChangeStep = 'send';
    this.clearEmailChangeCountdown();
    this.emailChangeCountdown = 0;
    if (method === 'phone') {
      this.emailChangeDestination = this.emailChangePhoneTarget;
      this.useAlternateEmailChangePhone = !this.user?.phone;
      return;
    }
    this.useAlternateEmailChangePhone = false;
    this.emailChangeDestination = method === 'recovery-email' ? this.effectiveRecoveryEmail : (this.user?.email || '');
  }

  toggleEmailChangeAlternatePhone(useAlternate: boolean): void {
    this.useAlternateEmailChangePhone = useAlternate;
    if (!useAlternate) {
      this.emailChangeAlternatePhone = '';
      this.emailChangeDestinationPhone = this.user?.phone || this.emailChangeDestinationPhone;
    }
    this.emailChangeCode = '';
    this.emailChangeStep = 'send';
    this.clearEmailChangeCountdown();
    this.emailChangeCountdown = 0;
  }

  sendEmailChangePhoneCode(): void {
    if (!this.pendingEmailChange || this.emailChangeCountdown > 0 || this.isSendingEmailChangeCode) return;
    const targetPhone = this.emailChangePhoneTarget;
    if (this.emailChangeVerificationMethod === 'phone' && !targetPhone) {
      this.feedback.warning('Enter the phone number where we should send the verification code.', 'Phone number required');
      return;
    }
    if (this.emailChangeVerificationMethod === 'recovery-email' && !this.effectiveRecoveryEmail) {
      this.feedback.warning('Add a recovery email first, or choose your account email.', 'Recovery email required');
      return;
    }

    this.isSendingEmailChangeCode = true;
    this.authService.sendEmailChangePhoneCode(
      this.pendingEmailChange,
      this.emailChangeVerificationMethod === 'phone' && this.useAlternateEmailChangePhone ? targetPhone : undefined,
      this.emailChangeVerificationMethod
    ).subscribe({
      next: (response) => {
        const destination = response.destination || targetPhone || this.emailChangeDestinationLabel;
        this.emailChangeDestination = destination;
        if (this.emailChangeVerificationMethod === 'phone') this.emailChangeDestinationPhone = destination;
        this.emailChangeStep = 'code';
        this.startEmailChangeCountdown();
        this.feedback.success(`We sent a verification code to ${destination}.`, 'Code sent');
        this.isSendingEmailChangeCode = false;
      },
      error: (err) => {
        const message = this.extractProfileError(err) || 'Could not send the verification code.';
        if (this.emailChangeVerificationMethod === 'phone' && this.shouldFallbackEmailChangeToEmail(message)) {
          this.feedback.info('SMS verification was not available, so EverCare will send the code to your account email instead.', 'Switching to email');
          this.emailChangeVerificationMethod = 'email';
          this.emailChangeDestination = this.user?.email || '';
          this.useAlternateEmailChangePhone = false;
          this.emailChangeStep = 'send';
          this.clearEmailChangeCountdown();
          this.emailChangeCountdown = 0;
          this.isSendingEmailChangeCode = false;
          setTimeout(() => this.sendEmailChangePhoneCode(), 250);
          return;
        }
        this.feedback.error(message, 'Email change failed');
        this.isSendingEmailChangeCode = false;
      }
    });
  }

  private shouldFallbackEmailChangeToEmail(message: string): boolean {
    const normalized = message.toLowerCase();
    return normalized.includes('sms')
      || normalized.includes('phone number')
      || normalized.includes('phone');
  }

  confirmEmailChange(): void {
    const code = this.emailChangeCode.trim();
    if (!/^\d{6}$/.test(code)) {
      this.feedback.warning('Enter the 6-digit code first.', 'Verification code');
      return;
    }
    this.isConfirmingEmailChange = true;
    this.authService.confirmEmailChange({ newEmail: this.pendingEmailChange, code, verificationMethod: this.emailChangeVerificationMethod }).subscribe({
      next: () => {
        this.emailChangeStep = 'success';
        this.personalForm.patchValue({ email: this.pendingEmailChange });
        this.feedback.success('Your email was changed. Please verify the new email when you are ready.', 'Email changed');
        this.isConfirmingEmailChange = false;
        this.authService.fetchCurrentUser().subscribe();
        setTimeout(() => this.closeEmailChangeModal(), 1400);
      },
      error: (err) => {
        this.feedback.error(this.extractProfileError(err) || 'Could not confirm your email change.', 'Verification failed');
        this.isConfirmingEmailChange = false;
      }
    });
  }

  private startEmailChangeCountdown(): void {
    this.clearEmailChangeCountdown();
    this.emailChangeCountdown = 60;
    this.emailChangeCountdownTimer = setInterval(() => {
      this.emailChangeCountdown = Math.max(0, this.emailChangeCountdown - 1);
      if (this.emailChangeCountdown === 0) this.clearEmailChangeCountdown();
    }, 1000);
  }

  private clearEmailChangeCountdown(): void {
    if (this.emailChangeCountdownTimer) {
      clearInterval(this.emailChangeCountdownTimer);
      this.emailChangeCountdownTimer = null;
    }
  }

  sendProfilePasswordResetCode(): void {
    if (!this.user || this.passwordResetCountdown > 0 || this.isPasswordResetBusy) return;
    this.isPasswordResetBusy = true;
    this.authService.sendPasswordResetCode(this.user.email, 'email').subscribe({
      next: () => {
        this.passwordResetStep = 'code';
        this.startPasswordResetCountdown();
        this.feedback.success('Password reset code sent to your email.', 'Code sent');
        this.isPasswordResetBusy = false;
      },
      error: (err) => {
        this.feedback.error(this.extractProfileError(err) || 'Could not send password reset code.', 'Reset failed');
        this.isPasswordResetBusy = false;
      }
    });
  }

  continueProfilePasswordResetCode(): void {
    if (!/^\d{6}$/.test(this.passwordResetCode.trim())) {
      this.feedback.warning('Enter the 6-digit reset code.', 'Reset code');
      return;
    }
    this.passwordResetStep = 'password';
  }

  confirmProfilePasswordReset(): void {
    if (!this.user) return;
    if (this.passwordResetNewPassword !== this.passwordResetConfirmPassword) {
      this.feedback.error('Passwords do not match.', 'Password reset');
      return;
    }
    if (this.getPasswordScore(this.passwordResetNewPassword) < 5) {
      this.feedback.error('Use uppercase, lowercase, number, symbol, and at least 8 characters.', 'Weak password');
      return;
    }
    this.isPasswordResetBusy = true;
    this.authService.confirmPasswordReset({
      email: this.user.email,
      code: this.passwordResetCode.trim(),
      newPassword: this.passwordResetNewPassword
    }).subscribe({
      next: () => {
        this.passwordResetStep = 'success';
        this.feedback.success('Your password was updated.', 'Password changed');
        this.isPasswordResetBusy = false;
      },
      error: (err) => {
        this.feedback.error(this.extractProfileError(err) || 'Password reset failed.', 'Reset failed');
        this.isPasswordResetBusy = false;
      }
    });
  }

  private startPasswordResetCountdown(): void {
    this.clearPasswordResetCountdown();
    this.passwordResetCountdown = 60;
    this.passwordResetTimer = setInterval(() => {
      this.passwordResetCountdown = Math.max(0, this.passwordResetCountdown - 1);
      if (this.passwordResetCountdown === 0) this.clearPasswordResetCountdown();
    }, 1000);
  }

  private clearPasswordResetCountdown(): void {
    if (this.passwordResetTimer) {
      clearInterval(this.passwordResetTimer);
      this.passwordResetTimer = null;
    }
  }

  private resetPasswordResetState(): void {
    this.passwordResetStep = 'email';
    this.passwordResetCode = '';
    this.passwordResetNewPassword = '';
    this.passwordResetConfirmPassword = '';
    this.isPasswordResetBusy = false;
    this.clearPasswordResetCountdown();
  }

  getPasswordScore(password: string): number {
    return [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ].filter(Boolean).length;
  }

  getProfileResetPasswordStrength(): { level: number; message: string } {
    const level = this.getPasswordScore(this.passwordResetNewPassword || '');
    const messages = ['Very weak', 'Weak', 'Fair', 'Good', 'Almost strong', 'Strong'];
    return { level, message: messages[level] };
  }

  getProfileResetStrengthPercentage(): number {
    return (this.getProfileResetPasswordStrength().level / 5) * 100;
  }

  getProfileResetStrengthClass(): string {
    const level = this.getProfileResetPasswordStrength().level;
    if (level <= 2) return 'strength-weak';
    if (level <= 4) return 'strength-good';
    return 'strength-strong';
  }

  get profileResetPasswordConfirmationState(): 'idle' | 'match' | 'mismatch' {
    if (!this.passwordResetNewPassword || !this.passwordResetConfirmPassword) return 'idle';
    return this.passwordResetNewPassword === this.passwordResetConfirmPassword ? 'match' : 'mismatch';
  }

  get profileResetPasswordConfirmationProgress(): number {
    if (this.profileResetPasswordConfirmationState === 'idle') return 0;
    if (this.profileResetPasswordConfirmationState === 'match') return 100;
    const passwordLength = Math.max(this.passwordResetNewPassword.length, 1);
    return Math.min(100, Math.max(18, (this.passwordResetConfirmPassword.length / passwordLength) * 100));
  }

  getRoleBadgeColor(): string {
    switch (this.user?.role) {
      case 'PATIENT': return 'bg-blue-500';
      case 'CAREGIVER': return 'bg-green-500';
      case 'DOCTOR': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  }

  getRoleBadgeClass(): string {
    switch (this.user?.role) {
      case 'PATIENT': return 'role-patient';
      case 'CAREGIVER': return 'role-caregiver';
      case 'DOCTOR': return 'role-doctor';
      case 'ADMIN': return 'role-admin';
      default: return 'role-default';
    }
  }

  getRoleDisplayName(): string {
    const role = this.user?.role;
    if (!role) return 'EverCare Member';
    return role.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  openPatientInfo(patient: User): void {
    this.selectedPatientInfo = patient;
    const key = this.patientStatusKey(patient);
    if (!this.caregiverPatientMedicalStatus[key]) {
      this.caregiverPatientMedicalStatus[key] = { loading: false, record: null, latestAssessment: null, alzheimerAssessment: null };
    }
  }

  closePatientInfo(): void {
    this.selectedPatientInfo = null;
  }

  get selectedPatientStatus(): { loading: boolean; record: any | null; latestAssessment: any | null; alzheimerAssessment: any | null } {
    return this.selectedPatientInfo
      ? this.getPatientMedicalStatus(this.selectedPatientInfo)
      : { loading: false, record: null, latestAssessment: null, alzheimerAssessment: null };
  }

  getPatientMedicalStatus(patient: User): { loading: boolean; record: any | null; latestAssessment: any | null; alzheimerAssessment: any | null } {
    return this.caregiverPatientMedicalStatus[this.patientStatusKey(patient)] || {
      loading: false,
      record: null,
      latestAssessment: null,
      alzheimerAssessment: null
    };
  }

  private patientStatusKey(patient: User): string {
    return (patient.userId || patient.email || patient.name || '').trim().toLowerCase();
  }

  private resolveUserId(user: User): string {
    return (user.userId || user.email || '').trim();
  }

  trackByEmail(index: number, item: User): string {
    return item.email;
  }

  goToFaceSetup(): void {
  this.router.navigate(['/setup-face-id'], { queryParams: { returnTo: 'profile' } });
}

private scrollToSettingsSection(): void {
  const settingsSection = document.getElementById('profile-settings-section');
  settingsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

private scrollToPersonalInfoSection(): void {
  const personalSection = document.getElementById('profile-personal-info-section');
  personalSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

private showProfileUpdatedNotice(): void {
  this.showProfileUpdatedPopup = true;
  if (this.profilePopupTimeout) clearTimeout(this.profilePopupTimeout);
  this.profilePopupTimeout = setTimeout(() => {
    this.showProfileUpdatedPopup = false;
    this.profilePopupTimeout = null;
  }, 2200);
}

private loadAssessmentResult(user: User): void {
  const saved = localStorage.getItem(this.assessmentStorageKey(user));
  if (!saved) {
    this.assessmentResult = null;
    return;
  }

  try {
    this.assessmentResult = JSON.parse(saved);
  } catch {
    this.assessmentResult = null;
  }
}

private assessmentStorageKey(user: User): string {
  const identifier = (user.userId || user.email || 'patient').trim().toLowerCase();
  return `assessmentResult:${identifier}`;
}


 getClusterFriendlyLabel(label: string, id: number): string {
  const map: Record<number, string> = {
    0: 'Low Risk Profile',
    1: 'Moderate Risk Profile',
    2: 'High Risk Profile',
  };
  return map[id] ?? label;
}


goToMedicalRecord(): void {
  this.router.navigate(['/medical-record']);
}

goToAddMedicalRecord(): void {
  this.router.navigate(['/medical-record/new']);
}

goToPatientMedicalRecord(patient: User): void {
  this.router.navigate(['/medical-record/new'], {
    queryParams: {
      patientId: this.resolveUserId(patient),
      patientEmail: patient.email,
      patientName: patient.name || patient.email
    }
  });
}

goToPatientMedicalAssessment(patient: User): void {
  this.router.navigate(['/assessment'], {
    queryParams: {
      patientId: this.resolveUserId(patient),
      patientEmail: patient.email,
      patientName: patient.name || patient.email,
      source: 'caregiver-request',
      returnTo: 'profile'
    }
  });
}

goToPatientAlzheimerAssessment(patient: User): void {
  const patientId = this.resolveUserId(patient);
  localStorage.setItem('caregiverAlzheimerPatientId', patientId);
  localStorage.setItem('caregiverAlzheimerPatientEmail', patient.email || '');
  localStorage.setItem('caregiverAlzheimerPatientName', patient.name || patient.email || 'Patient');
  localStorage.setItem('caregiverAlzheimerReturnTo', 'profile');
  localStorage.setItem('alzAssessmentReturnTo', 'profile');
  localStorage.setItem('showAlzheimerAssessment', 'true');
  this.router.navigate(['/alzheimer-assessment']);
}
  
}
