import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import {
  AdminService,
  CreateAdminUserRequest,
  UpdateUserByAdminRequest,
  UserAdminDto
} from '../../../../core/services/admin.service';

type UserRole = 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN';
type DrawerMode = 'create' | 'edit' | null;
type UserFilter = 'ALL' | UserRole;

interface AdminUserFormModel {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class UsersComponent implements OnInit {
  readonly roles: UserRole[] = ['PATIENT', 'DOCTOR', 'CAREGIVER', 'ADMIN'];
  readonly filters: Array<{ value: UserFilter; label: string }> = [
    { value: 'ALL', label: 'All users' },
    { value: 'ADMIN', label: 'Admins' },
    { value: 'PATIENT', label: 'Patients' },
    { value: 'DOCTOR', label: 'Doctors' },
    { value: 'CAREGIVER', label: 'Caregivers' }
  ];

  users: UserAdminDto[] = [];
  loading = false;
  drawerMode: DrawerMode = null;
  selectedUser: UserAdminDto | null = null;
  activeFilter: UserFilter = 'ALL';
  currentPage = 1;
  pageSize = 8;

  formModel: AdminUserFormModel = this.createEmptyForm();
  @ViewChild('editorSection') private editorSection?: ElementRef<HTMLElement>;

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get adminCount(): number {
    return this.users.filter(user => user.role === 'ADMIN').length;
  }

  get verifiedCount(): number {
    return this.users.filter(user => !!user.isVerified).length;
  }

  get recentlyActiveCount(): number {
    const threshold = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return this.users.filter(user => user.lastSeenAt && new Date(user.lastSeenAt).getTime() >= threshold).length;
  }

  get filteredUsers(): UserAdminDto[] {
    return this.activeFilter === 'ALL'
      ? this.users
      : this.users.filter(user => user.role === this.activeFilter);
  }

  get pagedUsers(): UserAdminDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get pageStart(): number {
    return this.filteredUsers.length ? ((this.currentPage - 1) * this.pageSize) + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredUsers.length);
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.users = [...users].sort((left, right) =>
          new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
        );
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load users', error);
        this.toastr.error('Failed to load users', 'Error');
        this.loading = false;
      }
    });
  }

  openCreateAdmin(): void {
    this.drawerMode = 'create';
    this.selectedUser = null;
    this.formModel = this.createEmptyForm();
    this.activeFilter = 'ADMIN';
    this.currentPage = 1;
    this.scrollToEditor();
  }

  openEdit(user: UserAdminDto): void {
    this.drawerMode = 'edit';
    this.selectedUser = user;
    this.formModel = {
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: (user.role as UserRole) || 'PATIENT'
    };
    this.scrollToEditor();
  }

  setFilter(filter: UserFilter): void {
    this.activeFilter = filter;
    this.currentPage = 1;
  }

  setPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  getFilterCount(filter: UserFilter): number {
    return filter === 'ALL' ? this.users.length : this.users.filter(user => user.role === filter).length;
  }

  closeDrawer(): void {
    this.drawerMode = null;
    this.selectedUser = null;
    this.formModel = this.createEmptyForm();
  }

  saveUser(): void {
    if (this.drawerMode === 'create') {
      this.createAdminUser();
      return;
    }

    this.updateExistingUser();
  }

  deleteUser(user: UserAdminDto): void {
    if (!confirm(`Delete ${user.name || user.email}? This action cannot be undone.`)) {
      return;
    }

    this.adminService.deleteUser(user.userId).subscribe({
      next: () => {
        this.users = this.users.filter(item => item.userId !== user.userId);
        if (this.selectedUser?.userId === user.userId) {
          this.closeDrawer();
        }
        this.toastr.success('User deleted successfully', 'Success');
      },
      error: (error) => {
        console.error('Failed to delete user', error);
        this.toastr.error(error.error?.message || 'Failed to delete user', 'Error');
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

  formatRole(role: string | undefined): string {
    return (role || 'UNKNOWN').toLowerCase().replace(/^\w/, value => value.toUpperCase());
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

  private createAdminUser(): void {
    if (!this.formModel.name || !this.formModel.email || !this.formModel.password) {
      this.toastr.warning('Name, email, and password are required.', 'Missing fields');
      return;
    }

    const payload: CreateAdminUserRequest = {
      name: this.formModel.name.trim(),
      email: this.formModel.email.trim(),
      password: this.formModel.password,
      phone: this.formModel.phone.trim() || undefined
    };

    this.adminService.createAdminUser(payload).subscribe({
      next: (createdUser) => {
        this.users = [createdUser, ...this.users];
        this.activeFilter = 'ADMIN';
        this.currentPage = 1;
        this.toastr.success(`Admin account created for ${createdUser.email}`, 'Success');
        this.closeDrawer();
      },
      error: (error) => {
        console.error('Failed to create admin user', error);
        this.toastr.error(error.error?.message || 'Failed to create admin account', 'Error');
      }
    });
  }

  private updateExistingUser(): void {
    if (!this.selectedUser) {
      return;
    }

    const updatePayload: UpdateUserByAdminRequest = {
      email: this.formModel.email !== this.selectedUser.email ? this.formModel.email.trim() : undefined,
      role: this.formModel.role !== this.selectedUser.role ? this.formModel.role : undefined
    };

    if (!updatePayload.email && !updatePayload.role) {
      this.closeDrawer();
      return;
    }

    this.adminService.updateUser(this.selectedUser.userId, updatePayload).subscribe({
      next: (updatedUser) => {
        this.users = this.users.map(user => user.userId === updatedUser.userId ? updatedUser : user);
        this.toastr.success('User updated successfully', 'Success');
        this.closeDrawer();
      },
      error: (error) => {
        console.error('Failed to update user', error);
        this.toastr.error(error.error?.message || 'Failed to update user', 'Error');
      }
    });
  }

  private createEmptyForm(): AdminUserFormModel {
    return {
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'ADMIN'
    };
  }

  private scrollToEditor(): void {
    setTimeout(() => {
      this.editorSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
