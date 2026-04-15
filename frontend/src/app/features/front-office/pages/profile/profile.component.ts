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
  const date = new Date(control.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) return { futureDate: true };
  return null;
}

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const phoneRegex = /^[0-9+\-() ]+$/;
  if (control.value && !phoneRegex.test(control.value)) return { invalidPhone: true };
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

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
    private router: Router,        // ← add
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

  private populateForm(): void {
    if (!this.user) return;
    this.personalForm.patchValue({
      name: this.user.name,
      email: this.user.email,
      phone: this.user.phone || '',
      dateOfBirth: this.user.dateOfBirth || '',
      emergencyContact: this.user.emergencyContact || '',
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
    if (tab !== 'settings') this.isChangingPassword = false;
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
      phone: formValue.phone,
      dateOfBirth: formValue.dateOfBirth,
      emergencyContact: formValue.emergencyContact,
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
  this.router.navigate(['/setup-face-id']);
}
  
}