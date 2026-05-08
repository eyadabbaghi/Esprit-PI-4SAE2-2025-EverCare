import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService, User, UpdateUserRequest, ChangePasswordRequest } from '../login/auth.service';
import { Router } from '@angular/router';
import { FaceService } from '../../services/camera/face.service';

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
  showPictureMenu = false;
  selectedFile: File | null = null;

  user: User | null = null;
  private userSub!: Subscription;

  personalForm: FormGroup;
  passwordData = { currentPassword: '', newPassword: '' };
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

  // Role‑specific connected users (full User objects)
  caregivers: User[] = [];
  patients: User[] = [];
  assignedDoctor: User | null = null;

  // Modal states
  showDoctorSearch = false;
  showCaregiverSearch = false;      // for patients adding caregivers
  showPatientSearch = false;         // for caregivers adding patients
  assessmentResult: any = null;   // stores the saved result

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
     public router: Router,       // ← add
    private faceService: FaceService  // ← add
  ) {
    this.personalForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneValidator]],
      address: [''],
      dateOfBirth: ['', [Validators.required, pastDateValidator]],
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
    this.personalForm.patchValue({
      name: this.user.name,
      email: this.user.email,
      phone: this.stripKnownCountryCode(this.user.phone, 'phone') || '',
      dateOfBirth: this.user.dateOfBirth || '',
      emergencyContact: this.stripKnownCountryCode(this.user.emergencyContact, 'emergency') || '',
      yearsExperience: this.user.yearsExperience,
      specialization: this.user.specialization,
      medicalLicense: this.user.medicalLicense,
      workplaceType: this.user.workplaceType,
      workplaceName: this.user.workplaceName,
    });
  }

  private loadConnectedUsers(): void {
    if (!this.user) return;

    const fetchUser = (email: string) => 
      this.authService.getUserByEmail(email).pipe(
        catchError(() => of({ email, name: email.split('@')[0] } as User))
      );

    if (this.user.role === 'PATIENT') {
      // Caregivers
      const caregiverEmails = this.user.caregiverEmails || [];
      if (caregiverEmails.length) {
        forkJoin(caregiverEmails.map(email => fetchUser(email))).subscribe(users => {
          this.caregivers = users;
        });
      } else {
        this.caregivers = [];
      }

      // Doctor
      if (this.user.doctorEmail) {
        fetchUser(this.user.doctorEmail).subscribe(doctor => {
          this.assignedDoctor = doctor;
        });
      } else {
        this.assignedDoctor = null;
      }
    } else if (this.user.role === 'CAREGIVER') {
      const patientEmails = this.user.patientEmails || [];
      if (patientEmails.length) {
        forkJoin(patientEmails.map(email => fetchUser(email))).subscribe(users => {
          this.patients = users;
        });
      } else {
        this.patients = [];
      }
    } else if (this.user.role === 'DOCTOR') {
      const patientEmails = this.user.patientEmails || [];
      if (patientEmails.length) {
        forkJoin(patientEmails.map(email => fetchUser(email))).subscribe(users => {
          this.patients = users;
        });
      } else {
        this.patients = [];
      }
    }
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
    else this.isEditing = true;
  }

  handleSaveProfile(): void {
    if (!this.user) return;

    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      this.toastr.warning('Please fix the errors in the form');
      return;
    }

    const formValue = this.personalForm.value;
    const updateData: UpdateUserRequest = {
      name: formValue.name,
      email: formValue.email,
      phone: this.composePhoneNumber(this.phoneCountryCode, formValue.phone),
      dateOfBirth: formValue.dateOfBirth,
      emergencyContact: this.composePhoneNumber(this.emergencyCountryCode, formValue.emergencyContact),
    };

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
        this.toastr.success('Profile updated successfully');
        this.isEditing = false;
        this.isLoading = false;
        if (response.token) localStorage.setItem('auth_token', response.token);
        if (response.user) this.authService.fetchCurrentUser().subscribe();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to update profile');
        this.isLoading = false;
      }
    });
  }

  toggleChangePassword(): void {
    this.isChangingPassword = !this.isChangingPassword;
    this.passwordData = { currentPassword: '', newPassword: '' };
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
      this.selectedFile = file;
      this.uploadPicture();
    }
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
  confirmDeleteAccount(): void {
    if (confirm('Delete your account? This cannot be undone.')) {
      this.deleteAccount();
    }
  }
  private deleteAccount(): void {
    this.isLoading = true;
    this.authService.deleteAccount().subscribe({
      next: () => {
        this.toastr.success('Account deleted');
        this.authService.logout();
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
    this.isLoading = true;
    this.authService.updateProfile(updateData).subscribe({
      next: () => {
        this.toastr.success(`Dr. ${doctor.name} added to your care team`);
        this.authService.fetchCurrentUser().subscribe();
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to associate doctor');
        this.isLoading = false;
      }
    });
  }

  // For patients adding caregivers
  onCaregiverSelected(caregiver: User): void {
    const updateData: UpdateUserRequest = { connectedEmail: caregiver.email };
    this.authService.updateProfile(updateData).subscribe({
      next: () => {
        this.toastr.success(`Caregiver ${caregiver.name} added`);
        this.authService.fetchCurrentUser().subscribe();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to associate caregiver');
      }
    });
  }

  // For caregivers adding patients
  onPatientSelected(patient: User): void {
    const updateData: UpdateUserRequest = { connectedEmail: patient.email };
    this.authService.updateProfile(updateData).subscribe({
      next: () => {
        this.toastr.success(`Patient ${patient.name} added`);
        this.authService.fetchCurrentUser().subscribe();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Failed to associate patient');
      }
    });
  }

 removeConnection(user: User): void {
  let updateData: UpdateUserRequest = {};
  if (user.role === 'DOCTOR') {
    // Send the same email to toggle (backend will clear if it's the same)
    updateData.doctorEmail = user.email;
  } else {
    // For caregiver/patient, send the email to toggle
    updateData.connectedEmail = user.email;
  }
  this.authService.updateProfile(updateData).subscribe({
    next: () => {
      this.toastr.info(`${user.role} removed`);
      this.authService.fetchCurrentUser().subscribe();
    },
    error: (err) => {
      console.error(err);
      this.toastr.error('Failed to remove connection');
    }
  });
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

  private stripKnownCountryCode(value: string | undefined, target: 'phone' | 'emergency'): string {
    const raw = value?.trim() ?? '';
    if (!raw.startsWith('+')) return raw;

    const match = this.countries.find(country => raw.startsWith(country.code));
    if (!match) return raw;

    if (target === 'phone') {
      this.phoneCountryCode = match.code;
    } else {
      this.emergencyCountryCode = match.code;
    }

    return raw.slice(match.code.length).trim();
  }

  private composePhoneNumber(countryCode: string, value: string): string {
    const phone = String(value ?? '').trim();
    if (!phone) return '';
    return phone.startsWith('+') ? phone : `${countryCode} ${phone}`;
  }

  getRoleBadgeColor(): string {
    switch (this.user?.role) {
      case 'PATIENT': return 'bg-blue-500';
      case 'CAREGIVER': return 'bg-green-500';
      case 'DOCTOR': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
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
  
}
