import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface User {
  userId?: string;
  keycloakId?: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  verified?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  profilePicture?: string;
}

export interface AuthResponse {
  token: string;
  user?: User;
}

export interface FaceLoginResponse extends AuthResponse {
  email?: string;
  userId?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  profilePicture?: string;
  yearsExperience?: number;
  specialization?: string;
  medicalLicense?: string;
  workplaceType?: string;
  workplaceName?: string;
  connectedEmail?: string;
  doctorEmail?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private evercareAuthUrl = 'http://localhost:8089/EverCare/auth';
  private dailymeBaseUrl = 'http://localhost:8089/dailyme';

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
    return this.http.post<AuthResponse>(`${this.evercareAuthUrl}/login`, credentials).pipe(
      switchMap((response) => this.finishAuth(response))
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.evercareAuthUrl}/register`, userData).pipe(
      switchMap((response) => this.finishAuth(response))
    );
  }

  completeFaceLogin(response: FaceLoginResponse): Observable<FaceLoginResponse> {
    return this.finishAuth(response);
  }

  fetchCurrentUser(): Observable<User | null> {
    const token = this.getToken();
    if (!token) {
      this.setCurrentUser(null);
      return of(null);
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<User>(`${this.evercareAuthUrl}/me`, { headers }).pipe(
      tap((user) => this.setCurrentUser(user)),
      catchError(() => {
        const decoded = this.decodeJwt(token);
        const fallbackUser: User = {
          userId: decoded?.sub || decoded?.userId || decoded?.id,
          email: decoded?.email,
          role: decoded?.role || decoded?.authorities?.[0],
          name: decoded?.name || decoded?.username,
          keycloakId: decoded?.keycloakId
        };
        this.setCurrentUser(fallbackUser);
        return of(fallbackUser);
      })
    );
  }

  updateProfile(data: UpdateUserRequest): Observable<any> {
    const base = this.evercareAuthUrl.replace('/auth', '');
    return this.http.put<any>(`${base}/users/profile`, data, { headers: this.authHeaders() });
  }

  changePassword(data: ChangePasswordRequest): Observable<any> {
    const base = this.evercareAuthUrl.replace('/auth', '');
    return this.http.put<any>(`${base}/users/change-password`, data, { headers: this.authHeaders() });
  }

  deleteAccount(): Observable<any> {
    const base = this.evercareAuthUrl.replace('/auth', '');
    return this.http.delete<any>(`${base}/users/profile`, { headers: this.authHeaders() });
  }

  uploadProfilePicture(file: File): Observable<{ profilePicture: string }> {
    const base = this.evercareAuthUrl.replace('/auth', '');
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ profilePicture: string }>(`${base}/users/profile/picture`, formData, {
      headers: this.authHeaders()
    });
  }

  removeProfilePicture(): Observable<any> {
    const base = this.evercareAuthUrl.replace('/auth', '');
    return this.http.delete<any>(`${base}/users/profile/picture`, { headers: this.authHeaders() });
  }

  getDailymeBaseUrl(): string {
    return this.dailymeBaseUrl;
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

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem('auth_token');
  }

  private finishAuth<T extends AuthResponse>(response: T): Observable<T> {
    this.storeToken(response.token);

    if (response.user) {
      this.setCurrentUser(response.user);
      return of(response);
    }

    return this.fetchCurrentUser().pipe(map(() => response));
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private storeToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('auth_token', token);
    }
  }

  private setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    if (!this.isBrowser) {
      return;
    }

    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('current_user');
    }
  }

  private loadStoredUser(): void {
    if (!this.isBrowser) {
      return;
    }

    const storedUser = localStorage.getItem('current_user');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  private decodeJwt(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(payload)
          .split('')
          .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
