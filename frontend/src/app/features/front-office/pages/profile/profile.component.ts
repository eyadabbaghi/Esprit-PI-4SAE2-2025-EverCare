import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { AuthService, User, UpdateUserRequest, ChangePasswordRequest } from '../login/auth.service';

function pastDateValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
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

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  emergencyContact: string;
  bloodType: string;
  allergies: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  activeTab: 'personal' | 'health' | 'settings' = 'personal';
  isEditing = false;
  isChangingPassword = false;
  isLoading = false;

  user: User | null = null;
  private userSub!: Subscription;

  showPictureMenu = false;
  selectedFile: File | null = null;

  passwordData = { currentPassword: '', newPassword: '' };

  personalForm!: FormGroup;

  phoneCountryCode = '+1';
  emergencyCountryCode = '+1';

  profileData: ProfileData = {
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    emergencyContact: '',
    bloodType: '',
    allergies: '',
  };

  constructor(
    private readonly toastr: ToastrService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.createForm();
  }

  private createForm(): void {
    this.personalForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneValidator]],
      address: [''],
      dateOfBirth: ['', [Validators.required, pastDateValidator]],
      emergencyContact: ['', [Validators.required, phoneValidator]],
    });
  }

  ngOnInit(): void {
    // Refresh current user on load (safe)
    this.authService.fetchCurrentUser().subscribe();

    this.userSub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;

      if (user) {
        // ✅ NEVER use user.dateOfBirth / user.emergencyContact (not in User type)
        this.profileData = {
          name: user.name ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
          address: this.profileData.address,
          dateOfBirth: this.profileData.dateOfBirth,
          emergencyContact: this.profileData.emergencyContact,
          bloodType: this.profileData.bloodType,
          allergies: this.profileData.allergies,
        };

        this.personalForm.patchValue({
          name: user.name ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
          address: this.profileData.address,
          dateOfBirth: this.profileData.dateOfBirth,
          emergencyContact: this.profileData.emergencyContact,
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
  }

  setTab(tab: 'personal' | 'health' | 'settings'): void {
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
      this.toastr.warning('Please fix the errors in the form', 'Validation Error');
      return;
    }

    const formValue = this.personalForm.value;
    const updateData: UpdateUserRequest = {
      name: formValue.name,
      email: formValue.email,
      phone: formValue.phone,
    };

    this.isLoading = true;
    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.toastr.success('Profile updated successfully!', 'Success');
        this.isEditing = false;
        this.isLoading = false;

        // refresh user from backend
        this.authService.fetchCurrentUser().subscribe();

        // if backend sends a new token
        if (response?.token) localStorage.setItem('auth_token', response.token);
      },
      error: (err) => {
        console.error('Update failed', err);
        this.toastr.error(err.error?.message || 'Failed to update profile', 'Error');
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
      this.toastr.warning('Please fill all fields', 'Warning');
      return;
    }

    this.isLoading = true;
    const request: ChangePasswordRequest = {
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    };

    this.authService.changePassword(request).subscribe({
      next: () => {
        this.toastr.success('Password changed successfully', 'Success');
        this.isChangingPassword = false;
        this.isLoading = false;
        this.passwordData = { currentPassword: '', newPassword: '' };
      },
      error: (err) => {
        console.error('Password change failed', err);
        this.toastr.error(err.error?.message || 'Failed to change password', 'Error');
        this.isLoading = false;
      }
    });
  }

  togglePictureMenu(): void {
    this.showPictureMenu = !this.showPictureMenu;
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('profile-picture-input') as HTMLInputElement | null;
    fileInput?.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
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
        this.toastr.success('Profile picture updated', 'Success');
        if (this.user) this.user.profilePicture = response.profilePicture;

        this.authService.fetchCurrentUser().subscribe();
        this.isLoading = false;
        this.showPictureMenu = false;
        this.selectedFile = null;
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.toastr.error('Failed to upload picture', 'Error');
        this.isLoading = false;
      }
    });
  }

  removePicture(): void {
    this.isLoading = true;

    this.authService.removeProfilePicture().subscribe({
      next: () => {
        this.toastr.success('Profile picture removed', 'Success');
        if (this.user) this.user.profilePicture = undefined;

        this.authService.fetchCurrentUser().subscribe();
        this.isLoading = false;
        this.showPictureMenu = false;
      },
      error: (err) => {
        console.error('Remove failed', err);
        this.toastr.error('Failed to remove picture', 'Error');
        this.isLoading = false;
      }
    });
  }

  confirmDeleteAccount(): void {
    const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (confirmed) this.deleteAccount();
  }

  private deleteAccount(): void {
    this.isLoading = true;

    this.authService.deleteAccount().subscribe({
      next: () => {
        this.toastr.success('Account deleted', 'Goodbye');
        this.authService.logout();
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.toastr.error(err.error?.message || 'Failed to delete account', 'Error');
        this.isLoading = false;
      }
    });
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  }

  isInvalid(controlName: string): boolean {
    const control = this.personalForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }
}
