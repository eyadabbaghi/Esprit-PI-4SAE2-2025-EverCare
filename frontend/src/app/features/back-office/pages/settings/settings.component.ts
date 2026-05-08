import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, ChangePasswordRequest } from '../../../front-office/pages/login/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  deleteConfirmation = '';
  isSavingPassword = false;
  isDeleting = false;

  constructor(
    public authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  get currentUser() {
    return this.authService.getCurrentUserValue();
  }

  get passwordConfirmationState(): 'idle' | 'match' | 'mismatch' {
    if (!this.passwordForm.confirmPassword || !this.passwordForm.newPassword) {
      return 'idle';
    }

    return this.passwordForm.newPassword === this.passwordForm.confirmPassword ? 'match' : 'mismatch';
  }

  get passwordConfirmationProgress(): number {
    if (this.passwordConfirmationState === 'idle') {
      return 0;
    }

    if (this.passwordConfirmationState === 'match') {
      return 100;
    }

    const targetLength = Math.max(this.passwordForm.newPassword.length, 1);
    return Math.min(100, Math.max(18, (this.passwordForm.confirmPassword.length / targetLength) * 100));
  }

  get passwordStrengthScore(): number {
    const password = this.passwordForm.newPassword;
    if (!password) {
      return 0;
    }

    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];

    return checks.filter(Boolean).length;
  }

  get passwordStrengthPercent(): number {
    return this.passwordStrengthScore ? (this.passwordStrengthScore / 5) * 100 : 0;
  }

  get passwordStrengthLabel(): string {
    if (!this.passwordForm.newPassword) {
      return '';
    }

    if (this.passwordStrengthScore <= 2) {
      return 'Weak password';
    }

    if (this.passwordStrengthScore <= 4) {
      return 'Good password';
    }

    return 'Strong password';
  }

  get passwordStrengthClass(): string {
    if (this.passwordStrengthScore <= 2) {
      return 'strength-weak';
    }

    if (this.passwordStrengthScore <= 4) {
      return 'strength-good';
    }

    return 'strength-strong';
  }

  updatePassword(): void {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) {
      this.toastr.warning('Please fill in the password fields.', 'Missing fields');
      return;
    }

    if (this.passwordStrengthScore < 5) {
      this.toastr.warning('New password must include at least 8 characters, uppercase, lowercase, a number, and a symbol.', 'Weak password');
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.toastr.warning('Password confirmation does not match.', 'Mismatch');
      return;
    }

    const payload: ChangePasswordRequest = {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    };

    this.isSavingPassword = true;
    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.toastr.success('Password updated successfully.', 'Success');
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        this.isSavingPassword = false;
      },
      error: (error) => {
        console.error('Failed to change password', error);
        this.toastr.error(error.error?.message || 'Failed to change password.', 'Error');
        this.isSavingPassword = false;
      }
    });
  }

  deleteAccount(): void {
    if (this.deleteConfirmation !== 'DELETE') {
      this.toastr.warning('Type DELETE to confirm account removal.', 'Confirmation required');
      return;
    }

    if (!confirm('Delete this admin account permanently? This cannot be undone.')) {
      return;
    }

    this.isDeleting = true;
    this.authService.deleteAccount().subscribe({
      next: () => {
        this.toastr.success('Account deleted successfully.', 'Success');
        this.authService.logout();
        this.router.navigate(['/login']);
        this.isDeleting = false;
      },
      error: (error) => {
        console.error('Failed to delete account', error);
        this.toastr.error(error.error?.message || 'Failed to delete account.', 'Error');
        this.isDeleting = false;
      }
    });
  }
}
