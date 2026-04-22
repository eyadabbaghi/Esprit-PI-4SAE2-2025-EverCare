import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AdminService, UserAdminDto } from '../../../../core/services/admin.service';

type UserRole = 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  roles: UserRole[] = ['PATIENT', 'DOCTOR', 'CAREGIVER', 'ADMIN'];

  users: UserAdminDto[] = [];
  loading = false;

  editingUser: UserAdminDto | null = null;
  isCreating = false;

  newUser: UserAdminDto = this.createEmptyUser();

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getAllUsers().subscribe({
      next: (data: UserAdminDto[]) => {
        this.users = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load users', err);
        this.toastr.error('Failed to load users', 'Error');
        this.loading = false;
      }
    });
  }

  get pagedUsers(): UserAdminDto[] {
    return this.users;
  }

  startCreate(): void {
    this.isCreating = true;
    this.editingUser = null;
    this.newUser = this.createEmptyUser();
  }

  startEdit(user: UserAdminDto): void {
    this.isCreating = false;
    this.editingUser = { ...user };
    this.newUser = { ...user };
  }

  cancelForm(): void {
    this.isCreating = false;
    this.editingUser = null;
    this.newUser = this.createEmptyUser();
  }

  saveUser(): void {
    if (this.isCreating) {
      this.toastr.warning('Creating new users not yet implemented', 'Info');
      return;
    }

    if (!this.editingUser) return;

    const updateData = {
      email: this.newUser.email !== this.editingUser.email ? this.newUser.email : undefined,
      role: this.newUser.role !== this.editingUser.role ? this.newUser.role : undefined
    };

    if (!updateData.email && !updateData.role) {
      this.cancelForm();
      return;
    }

    this.adminService.updateUser(this.editingUser.userId, updateData).subscribe({
      next: (updatedUser: UserAdminDto) => {
        this.toastr.success('User updated successfully', 'Success');
        const index = this.users.findIndex(u => u.userId === updatedUser.userId);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        this.cancelForm();
      },
      error: (err: any) => {
        console.error('Update failed', err);
        const errorMsg = err.error?.message || 'Failed to update user';
        this.toastr.error(errorMsg, 'Error');
      }
    });
  }

  deleteUser(user: UserAdminDto): void {
    if (!confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }
    this.adminService.deleteUser(user.userId).subscribe({
      next: () => {
        this.toastr.success('User deleted', 'Success');
        this.users = this.users.filter(u => u.userId !== user.userId);
        if (this.editingUser?.userId === user.userId) {
          this.cancelForm();
        }
      },
      error: (err: any) => {
        console.error('Delete failed', err);
        const errorMsg = err.error?.message || 'Failed to delete user';
        this.toastr.error(errorMsg, 'Error');
      }
    });
  }

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  private createEmptyUser(): UserAdminDto {
    return {
      userId: '',
      name: '',
      email: '',
      role: 'PATIENT',
      phone: '',
      isVerified: false,
      createdAt: '',
      profilePicture: ''
    };
  }
}