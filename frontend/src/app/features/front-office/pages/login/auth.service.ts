import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
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
  role: string; // 'PATIENT', 'CAREGIVER', 'DOCTOR', 'ADMIN'
}

export interface AuthResponse {
  token: string;
}

export interface User {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  isVerified?: boolean;
  createdAt?: string;
  profilePicture?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // EverCare Auth service (login/register/me/users)
 private evercareAuthUrl = 'http://localhost:8089/EverCare/auth';



  // Dailyme service base (DailyMe features)
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

  // ---------------------------
  // AUTH (EverCare)
  // ---------------------------
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.evercareAuthUrl}/login`, credentials).pipe(
      tap((res) => this.storeToken(res.token)),
      switchMap((res) => this.fetchCurrentUser().pipe(map(() => res)))
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.evercareAuthUrl}/register`, userData).pipe(
      tap((res) => this.storeToken(res.token)),
      switchMap((res) => this.fetchCurrentUser().pipe(map(() => res)))
    );
  }

  // ✅ used by profile.component.ts
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
        // fallback if /me fails
        const decoded = this.decodeJwt(token);
        const fallbackUser: User = {
          userId: decoded?.sub || decoded?.userId || decoded?.id,
          email: decoded?.email,
          role: decoded?.role || decoded?.authorities?.[0],
          name: decoded?.name || decoded?.username
        };
        this.setCurrentUser(fallbackUser);
        return of(fallbackUser);
      })
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // ---------------------------
  // USER PROFILE (EverCare users endpoints)
  // ---------------------------
  updateProfile(data: UpdateUserRequest): Observable<any> {
    const base = this.evercareAuthUrl.replace('/auth', ''); // http://localhost:8096/EverCare
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

  // ---------------------------
  // DAILYME BASE
  // ---------------------------
  getDailymeBaseUrl(): string {
    return this.dailymeBaseUrl;
  }

  // ---------------------------
  // SESSION
  // ---------------------------
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
    if (this.isBrowser) return localStorage.getItem('auth_token');
    return null;
  }

  private storeToken(token: string): void {
    if (this.isBrowser) localStorage.setItem('auth_token', token);
  }

  private setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    if (this.isBrowser) {
      if (user) localStorage.setItem('current_user', JSON.stringify(user));
      else localStorage.removeItem('current_user');
    }
  }

  private loadStoredUser(): void {
    if (!this.isBrowser) return;
    const storedUser = localStorage.getItem('current_user');
    if (storedUser) this.currentUserSubject.next(JSON.parse(storedUser));
  }

  private decodeJwt(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
