import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService, UpdateUserRequest, User } from '../../../front-office/pages/login/auth.service';

interface AdminProfileData {
  name: string;
  email: string;
  phone: string;
  role: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  isEditing = false;
  isLoading = false;
  showPictureMenu = false;
  selectedFile: File | null = null;

  user: User | null = null;
  profileData: AdminProfileData = {
    name: '',
    email: '',
    phone: '',
    role: 'ADMIN'
  };

  private userSub?: Subscription;

  constructor(
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.profileData = {
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || 'ADMIN'
        };
      }
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  toggleEdit(): void {
    if (this.isEditing) {
      this.saveProfile();
    } else {
      this.isEditing = true;
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.user) {
      this.profileData = {
        name: this.user.name || '',
        email: this.user.email || '',
        phone: this.user.phone || '',
        role: this.user.role || 'ADMIN'
      };
    }
  }

  saveProfile(): void {
    if (!this.user) {
      return;
    }

    const payload: UpdateUserRequest = {
      name: this.profileData.name.trim(),
      email: this.profileData.email.trim(),
      phone: this.profileData.phone.trim()
    };

    this.isLoading = true;
    this.authService.updateProfile(payload).subscribe({
      next: (response) => {
        const updatedUser = response?.user;
        if (updatedUser) {
          this.authService.setCurrentUser(updatedUser);
        }
        this.toastr.success('Profile updated successfully', 'Success');
        this.isEditing = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to update profile', error);
        this.toastr.error(error.error?.message || 'Failed to update profile', 'Error');
        this.isLoading = false;
      }
    });
  }

  goToSettings(): void {
    this.router.navigate(['/admin/settings']);
  }

  togglePictureMenu(): void {
    this.showPictureMenu = !this.showPictureMenu;
  }

  triggerFileInput(): void {
    const input = document.getElementById('profile-picture-input') as HTMLInputElement | null;
    input?.click();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    this.selectedFile = file;
    this.uploadPicture();
  }

  uploadPicture(): void {
    if (!this.selectedFile) {
      return;
    }

    this.isLoading = true;
    this.authService.uploadProfilePicture(this.selectedFile).subscribe({
      next: (response) => {
        if (this.user) {
          this.authService.setCurrentUser({
            ...this.user,
            profilePicture: response.profilePicture
          });
        }
        this.toastr.success('Profile picture updated', 'Success');
        this.selectedFile = null;
        this.showPictureMenu = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to upload profile picture', error);
        this.toastr.error('Failed to upload profile picture', 'Error');
        this.isLoading = false;
      }
    });
  }

  removePicture(): void {
    this.isLoading = true;
    this.authService.removeProfilePicture().subscribe({
      next: () => {
        if (this.user) {
          this.authService.setCurrentUser({
            ...this.user,
            profilePicture: undefined
          });
        }
        this.toastr.success('Profile picture removed', 'Success');
        this.showPictureMenu = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to remove profile picture', error);
        this.toastr.error('Failed to remove profile picture', 'Error');
        this.isLoading = false;
      }
    });
  }

  getInitials(name: string | undefined): string {
    if (!name) {
      return 'AD';
    }

    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(value: string | undefined): string {
    return value
      ? new Date(value).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : 'Unavailable';
  }
}
