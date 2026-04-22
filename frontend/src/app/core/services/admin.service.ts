import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../../features/front-office/pages/login/auth.service';

export interface UserAdminDto extends User {
  userId: string;
  phone?: string;
  isVerified?: boolean;
  createdAt?: string;
  profilePicture?: string;
}

export interface UpdateUserByAdminRequest {
  email?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8096/EverCare/admin';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserAdminDto[]> {
    return this.http.get<UserAdminDto[]>(`${this.apiUrl}/users`);
  }

  updateUser(userId: string, data: UpdateUserByAdminRequest): Observable<UserAdminDto> {
    return this.http.put<UserAdminDto>(`${this.apiUrl}/users/${userId}`, data);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`);
  }
}