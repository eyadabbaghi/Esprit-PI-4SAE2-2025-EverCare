import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { AuthService, User, UpdateUserRequest } from '../../../front-office/pages/login/auth.service';

interface AdminProfileData {
  name: string;
  email: string;
  phone: string;
  role: string;
  organization: string;
  timezone: string;
  language: string;
  notificationsEmail: boolean;
  notificationsSystem: boolean;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  activeTab: 'personal' | 'settings' = 'personal';
  isEditing = false;
  isLoading = false;
  showPictureMenu = false;
  selectedFile: File | null = null;

  user: User | null = null;
  private userSub!: Subscription;

  profileData: AdminProfileData = {
    name: '',
    email: '',
    phone: '',
    role: '',
    organization: 'EverCare',
    timezone: 'UTC',
    language: 'English',
    notificationsEmail: true,
    notificationsSystem: true,
  };

  constructor(
    private readonly toastr: ToastrService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // optional refresh (safe)
    this.authService.fetchCurrentUser().subscribe();

    this.userSub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;

      if (user) {
        // ✅ Fix TS2322: always fall back to string
        this.profileData.name = user.name ?? '';
        this.profileData.email = user.email ?? '';
        this.profileData.phone = user.phone ?? '';
        this.profileData.role = user.role ?? 'Admin';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
  }

  setTab(tab: 'personal' | 'settings'): void {
    this.activeTab = tab;
  }

  toggleEdit(): void {
    if (this.isEditing) this.saveProfile();
    else this.isEditing = true;
  }

  saveProfile(): void {
    if (!this.user) return;

    const updateData: UpdateUserRequest = {
      name: this.profileData.name,
      email: this.profileData.email,
      phone: this.profileData.phone
    };

    this.isLoading = true;
    this.authService.updateProfile(updateData).subscribe({
      next: (response: any) => {
        this.toastr.success('Profile updated successfully!', 'Success');
        this.isEditing = false;
        this.isLoading = false;

        // ✅ safe updates
        if (this.user) {
          this.user.name = response?.user?.name ?? this.user.name;
          this.user.email = response?.user?.email ?? this.user.email;
          this.user.phone = response?.user?.phone ?? this.user.phone;
        }

        if (response?.token) {
          localStorage.setItem('auth_token', response.token);
        }

        // refresh user
        this.authService.fetchCurrentUser().subscribe();
      },
      error: (err: any) => {
        console.error('Update failed', err);
        const errorMsg = err.error?.message || 'Failed to update profile';
        this.toastr.error(errorMsg, 'Error');
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
      next: (response: any) => {
        this.toastr.success('Profile picture updated', 'Success');
        if (this.user) {
          this.user.profilePicture = response?.profilePicture ?? this.user.profilePicture;
        }

        this.authService.fetchCurrentUser().subscribe();
        this.isLoading = false;
        this.showPictureMenu = false;
        this.selectedFile = null;
      },
      error: (err: any) => {
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
        if (this.user) {
          this.user.profilePicture = undefined;
        }

        this.authService.fetchCurrentUser().subscribe();
        this.isLoading = false;
        this.showPictureMenu = false;
      },
      error: (err: any) => {
        console.error('Remove failed', err);
        this.toastr.error('Failed to remove picture', 'Error');
        this.isLoading = false;
      }
    });
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase();
  }
}
