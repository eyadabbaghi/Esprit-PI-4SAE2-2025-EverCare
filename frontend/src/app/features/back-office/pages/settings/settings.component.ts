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

  updatePassword(): void {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) {
      this.toastr.warning('Please fill in the password fields.', 'Missing fields');
      return;
    }

    if (this.passwordForm.newPassword.length < 8) {
      this.toastr.warning('New password must be at least 8 characters.', 'Weak password');
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
