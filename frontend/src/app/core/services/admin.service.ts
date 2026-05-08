import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../../features/front-office/pages/login/auth.service';

export interface UserAdminDto extends User {
  userId: string;
  phone?: string;
  isVerified?: boolean;
  verified?: boolean;
  createdAt?: string;
  lastSeenAt?: string;
  profilePicture?: string;
}

export interface CreateAdminUserRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AdminCreatedUserResponse extends UserAdminDto {
  temporaryPasswordHint?: string;
}

export interface UpdateUserByAdminRequest {
  email?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
 //private apiUrl = 'http://localhost:8096/EverCare/admin';
  // New gateway URL
  private apiUrl = 'http://localhost:8089/EverCare/admin';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserAdminDto[]> {
    return this.http.get<UserAdminDto[]>(`${this.apiUrl}/users`).pipe(
      map(users => users.map(user => this.normalizeUser(user)))
    );
  }

  createAdminUser(data: CreateAdminUserRequest): Observable<AdminCreatedUserResponse> {
    return this.http.post<AdminCreatedUserResponse>(`${this.apiUrl}/users`, data).pipe(
      map(user => this.normalizeUser(user) as AdminCreatedUserResponse)
    );
  }

  updateUser(userId: string, data: UpdateUserByAdminRequest): Observable<UserAdminDto> {
    return this.http.put<UserAdminDto>(`${this.apiUrl}/users/${userId}`, data).pipe(
      map(user => this.normalizeUser(user))
    );
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`);
  }

  private normalizeUser(user: UserAdminDto): UserAdminDto {
    return {
      ...user,
      isVerified: user.isVerified ?? user.verified ?? false,
      createdAt: this.normalizeBackendDate((user as any).createdAt),
      lastSeenAt: this.normalizeBackendDate((user as any).lastSeenAt)
    };
  }

  private normalizeBackendDate(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
    }

    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nano = 0] = value.map(Number);
      if (!year) {
        return undefined;
      }
      const date = new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1000000));
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }

      if (/^\d{4},\d{1,2},\d{1,2}/.test(trimmed)) {
        return this.normalizeBackendDate(trimmed.split(',').map(part => Number(part.trim())));
      }

      const date = new Date(trimmed);
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    }

    return undefined;
  }
}
