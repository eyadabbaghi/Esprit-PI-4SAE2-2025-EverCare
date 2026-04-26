import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, UpdateUserRequest } from '../login/auth.service';

@Component({
  selector: 'app-setup-profile',
  templateUrl: './setup-profile.component.html',
})
export class SetupProfileComponent implements OnInit {
  profileForm: FormGroup;
  profileImage: string | null = null;
  selectedFile: File | null = null;
  isLoading = false;

  // User data from registration (passed via state)
  name: string = '';
  email: string = '';
  role: string = '';

  // For conditional rendering
  workplaceType: 'hospital' | 'private' = 'hospital';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { name: string; email: string; role: string };
    if (state) {
      this.name = state.name;
      this.email = state.email;
      this.role = state.role;
    } else {
      this.router.navigate(['/']);
    }

    // Build form with all possible fields
    this.profileForm = this.fb.group({
      dateOfBirth: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]+$/)]],
      emergencyContact: [''],           // initially no validator
      connectedEmail: ['', Validators.email], // email validator only, not required
      yearsExperience: [''],
      specialization: [''],
      medicalLicense: [''],
      workplace: [''],
    });

    this.updateValidators();
  }

  ngOnInit(): void {}

  /**
   * Dynamically set required validators based on role.
   */
  private updateValidators(): void {
    const emergencyControl = this.profileForm.get('emergencyContact');
    const yearsControl = this.profileForm.get('yearsExperience');
    const workplaceControl = this.profileForm.get('workplace');

    // Clear all role‑specific validators first
    emergencyControl?.clearValidators();
    yearsControl?.clearValidators();
    workplaceControl?.clearValidators();

    if (this.role === 'PATIENT' || this.role === 'CAREGIVER') {
      // emergency contact is required for patients and caregivers
      emergencyControl?.setValidators(Validators.required);
    } else if (this.role === 'DOCTOR') {
      // experience and workplace required for doctors
      yearsControl?.setValidators([Validators.required, Validators.min(0), Validators.max(60)]);
      workplaceControl?.setValidators(Validators.required);
      // emergency contact is optional for doctors
    }

    // Update validity
    emergencyControl?.updateValueAndValidity();
    yearsControl?.updateValueAndValidity();
    workplaceControl?.updateValueAndValidity();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.profileImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput(): void {
    document.getElementById('profile-picture-input')?.click();
  }

  getInitials(): string {
    return this.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  getRoleColor(): string {
    switch (this.role) {
      case 'PATIENT': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'CAREGIVER': return 'bg-green-100 text-green-700 border-green-300';
      case 'DOCTOR': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  onSubmit(): void {
    // Log invalid fields for debugging
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        if (control?.invalid) {
          console.log(`Field ${key} is invalid:`, control.errors);
        }
      });
      this.profileForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields correctly');
      return;
    }

    this.isLoading = true;

    const formValue = this.profileForm.value;
    const updateData: UpdateUserRequest = {
      dateOfBirth: formValue.dateOfBirth,
      phone: formValue.phoneNumber,
    };

    // Only include emergencyContact if it has a value (doctors may leave it blank)
    if (formValue.emergencyContact && formValue.emergencyContact.trim() !== '') {
      updateData.emergencyContact = formValue.emergencyContact;
    }

    // Only include connectedEmail if not empty
    if (formValue.connectedEmail && formValue.connectedEmail.trim() !== '') {
      updateData.connectedEmail = formValue.connectedEmail;
    }

    if (this.role === 'DOCTOR') {
      updateData.yearsExperience = formValue.yearsExperience ? parseInt(formValue.yearsExperience) : undefined;
      updateData.specialization = formValue.specialization;
      updateData.medicalLicense = formValue.medicalLicense;
      updateData.workplaceType = this.workplaceType;
      updateData.workplaceName = formValue.workplace;
    }

    // If a profile picture was selected, upload it first
    if (this.selectedFile) {
      this.authService.uploadProfilePicture(this.selectedFile).subscribe({
        next: (picResponse) => {
          updateData.profilePicture = picResponse.profilePicture;
          this.sendProfileUpdate(updateData);
        },
        error: (err) => {
          this.toastr.error('Failed to upload profile picture');
          this.isLoading = false;
        }
      });
    } else {
      this.sendProfileUpdate(updateData);
    }
  }

  private sendProfileUpdate(updateData: UpdateUserRequest): void {
    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.toastr.success('Profile setup complete!');
        if (response.user) {
          this.authService.fetchCurrentUser().subscribe();
        }
        this.router.navigate(['/setup-face-id']);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Profile update failed', err);
        const errorMsg = err.error?.message || 'Failed to save profile. Please try again.';
        this.toastr.error(errorMsg);
        this.isLoading = false;
      }
    });
  }
}