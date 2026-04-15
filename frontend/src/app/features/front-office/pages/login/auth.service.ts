import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, switchMap, tap, catchError, delay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

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

export interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

export interface FaceLoginResponse {
  token: string;
  email?: string;
  userId?: string;
  user?: User;
}

export interface User {
  userId?: string;
  keycloakId?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isVerified?: boolean;
  createdAt?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  yearsExperience?: number;
  specialization?: string;
  medicalLicense?: string;
  workplaceType?: string;
  workplaceName?: string;
  caregiverEmails?: string[];
  patientEmails?: string[];
  doctorEmail?: string;
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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8089/EverCare/auth';
  private usersUrl = 'http://localhost:8089/EverCare/users';

  private keycloakUrl = 'http://localhost:8180/realms/EverCareRealm/protocol/openid-connect/token';
  private clientId = 'frontend-app';
  private clientSecret = 'SMqMpg1PpqG4UcMOJM1WgTM0zNK5AhZF';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loadStoredUser();
  }

  // ---------- Login with Keycloak ----------
  login(credentials: LoginRequest): Observable<KeycloakTokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('client_id', this.clientId);
    body.set('client_secret', this.clientSecret);
    body.set('username', credentials.email);
    body.set('password', credentials.password);

    return this.http.post<KeycloakTokenResponse>(this.keycloakUrl, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }).pipe(
      tap(tokenResponse => this.handleTokenResponse(tokenResponse)),
      catchError(error => {
        console.error('Keycloak login error', error);
        throw error;
      })
    );
  }

  // ---------- Register ----------
  register(userData: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/register`, userData).pipe(
      tap(() => this.toastr.success('Registration successful. Logging you in...')),
      delay(3000),
      switchMap(() => this.login({ email: userData.email, password: userData.password })),
      map(() => ({ message: 'Registration and login successful' }))
    );
  }

  // ---------- Fetch current user ----------
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

  completeFaceLogin(response: FaceLoginResponse): Observable<User> {
    this.storeToken(response.token);

    if (response.user) {
      this.setCurrentUser(response.user);
      return of(response.user);
    }

    return this.fetchCurrentUser();
  }

  // ---------- Token handling ----------
  private handleTokenResponse(tokenResponse: KeycloakTokenResponse): void {
    this.storeToken(tokenResponse.access_token);
    this.fetchCurrentUser().subscribe({
      next: (user) => {
        this.http.post(`${this.apiUrl}/record-login`, {}).subscribe();
      },
      error: (err) => console.error('Failed to fetch user after login', err)
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

  // ---------- Logout ----------
logout(triggerFaceRecovery: boolean = false): void {
  const user = this.getCurrentUserValue();
  const wasPatient = user?.role === 'PATIENT';

  if (this.isBrowser) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');

    if (wasPatient && triggerFaceRecovery && user?.keycloakId) {
      localStorage.setItem('face_recovery_keycloakId', user.keycloakId);
      localStorage.setItem('face_recovery_email', user.email || '');
      localStorage.setItem('face_recovery_active', 'true');
      localStorage.setItem('face_recovery_since', Date.now().toString());
    }
  }

  this.currentUserSubject.next(null);
  this.router.navigate(['/login']); // always go to /login
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

  // ---------- Profile endpoints ----------
  updateProfile(data: UpdateUserRequest): Observable<any> {
    return this.http.put<any>(`${this.usersUrl}/profile`, data, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${this.getToken()}`)
    });
  }

  changePassword(data: ChangePasswordRequest): Observable<any> {
    return this.http.put(`${this.usersUrl}/change-password`, data);
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.usersUrl}/profile`);
  }

  uploadProfilePicture(file: File): Observable<{ profilePicture: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ profilePicture: string }>(`${this.usersUrl}/profile/picture`, formData, {
      headers: new HttpHeaders().set('Authorization', `Bearer ${this.getToken()}`)
    });
  }

  removeProfilePicture(): Observable<any> {
    return this.http.delete(`${this.usersUrl}/profile/picture`);
  }

  searchUsersByRole(term: string, role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.usersUrl}/search`, {
      params: { q: term, role }
    });
  }

  getUserByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/by-email`, {
      params: { email }
    });
  }

  // ---------- Google login – temporarily disabled ----------
  googleLogin(idToken: string): Observable<any> {
    this.toastr.warning('Google login is being migrated. Please use email/password.', 'Not available');
    return of(null);
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    if (this.isBrowser) {
      localStorage.setItem('current_user', JSON.stringify(user));
    }
  }
}
