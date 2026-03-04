import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string; // 'PATIENT', 'CAREGIVER', 'DOCTOR', 'ADMIN'
}

export interface AuthResponse {
  token: string;
}

export interface User {
  userId?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isVerified?: boolean;
  createdAt?: string;
  profilePicture?: string; 
}
// Add these interfaces at the top
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.authApiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loadStoredUser();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuth(response))
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => this.handleAuth(response))
    );
  }

  /**
   * Fetches the currently authenticated user's details.
   * Sends the JWT token in the Authorization header.
   */
  fetchCurrentUser(): Observable<User> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.getToken()}`);
    return this.http.get<User>(`${this.apiUrl}/me`, { headers }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        if (this.isBrowser) {
          localStorage.setItem('current_user', JSON.stringify(user));
        }
      })
    );
  }

 private handleAuth(response: AuthResponse): void {
  this.storeToken(response.token);
  // After storing token, fetch the user details
  this.fetchCurrentUser().subscribe({
    next: (user) => {
      // Set flag for new user welcome flow (only for registration, not login)
      // We need to know if this was a registration. We can't differentiate here.
      // So we'll move the flag setting to the LoginComponent after successful registration.
    },
    error: (err) => {
      console.error('Failed to fetch user after auth', err);
    }
  });
}

  private storeToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private loadStoredUser(): void {
    if (this.isBrowser) {
      const storedUser = localStorage.getItem('current_user');
      if (storedUser) {
        this.currentUserSubject.next(JSON.parse(storedUser));
      }
    }
  }

  // Inside AuthService class, add these methods:
updateProfile(data: UpdateUserRequest): Observable<any> {
  return this.http.put<any>(`${this.apiUrl.replace('/auth', '')}/users/profile`, data);
}
changePassword(data: ChangePasswordRequest): Observable<any> {
  return this.http.put(`${this.apiUrl.replace('/auth', '')}/users/change-password`, data);
}

deleteAccount(): Observable<any> {
  return this.http.delete(`${this.apiUrl.replace('/auth', '')}/users/profile`);
}


uploadProfilePicture(file: File): Observable<{ profilePicture: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return this.http.post<{ profilePicture: string }>(`${this.apiUrl.replace('/auth', '')}/users/profile/picture`, formData);
}

removeProfilePicture(): Observable<any> {
  return this.http.delete(`${this.apiUrl.replace('/auth', '')}/users/profile/picture`);
}
}
