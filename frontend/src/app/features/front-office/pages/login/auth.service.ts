import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
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
  isNewUser?: boolean;
}

export interface GoogleLoginResult {
  user: User;
  isNewUser?: boolean;
}

export interface User {
  userId?: string;
  keycloakId?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  recoveryEmail?: string;
  address?: string;
  country?: string;
  isVerified?: boolean;
  verified?: boolean;
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
  caregiverRelationships?: Record<string, string>;
  patientRelationships?: Record<string, string>;
  doctorEmail?: string;
  doctorEmails?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  recoveryEmail?: string;
  address?: string;
  country?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  profilePicture?: string;
  yearsExperience?: number;
  specialization?: string;
  medicalLicense?: string;
  workplaceType?: string;
  workplaceName?: string;
  connectedEmail?: string;
  relationshipType?: string;
  doctorEmail?: string;
  doctorEmails?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetConfirmRequest {
  email: string;
  code: string;
  newPassword: string;
}

export type VerificationMethod = 'phone' | 'email' | 'recovery-email';

export interface EmailChangeConfirmRequest {
  newEmail: string;
  code: string;
  verificationMethod?: VerificationMethod;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8089/EverCare/auth';
  private usersUrl = 'http://localhost:8089/EverCare/users';
  private directUsersUrl = 'http://localhost:8096/EverCare/users';
  private communicationApiUrl = 'http://localhost:8089/EverCare/communication-service/api';
  private assessmentUrl = 'http://localhost:8089/EverCare/assessment';

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
    this.retryPendingCommunicationEmailSync();
  }

  // ---------- Login ----------
  login(credentials: LoginRequest): Observable<User> {
    return this.http.post<KeycloakTokenResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(tokenResponse => this.storeTokens(tokenResponse)),
      switchMap(() => this.fetchCurrentUser()),
      switchMap(user => {
        const attemptedEmail = this.normalizeEmail(credentials.email);
        const currentEmail = this.normalizeEmail(user.email);
        if (attemptedEmail && currentEmail && attemptedEmail !== currentEmail) {
          this.clearStoredSession();
          this.currentUserSubject.next(null);
          return throwError(() => ({
            status: 401,
            error: {
              message: 'This account email was changed. Please sign in with the new email.'
            }
          }));
        }

        return of(user);
      }),
      tap(() => {
        this.http.post(`${this.apiUrl}/record-login`, {}).subscribe();
      }),
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
        const normalizedUser = this.normalizeUser(user);
        this.currentUserSubject.next(normalizedUser);
        if (this.isBrowser) {
          localStorage.setItem('current_user', JSON.stringify(normalizedUser));
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
  private storeToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('auth_token', token);
    }
  }

  private storeTokens(tokenResponse: KeycloakTokenResponse): void {
    this.storeToken(tokenResponse.access_token);
    if (this.isBrowser && tokenResponse.refresh_token) {
      localStorage.setItem('refresh_token', tokenResponse.refresh_token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  private refreshAccessToken(): Observable<KeycloakTokenResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearStoredSession();
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
      return throwError(() => ({ status: 401, message: 'Session expired' }));
    }

    return this.http.post<KeycloakTokenResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(tokenResponse => this.storeTokens(tokenResponse)),
      catchError(error => {
        this.clearStoredSession();
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }

  private retryAfterRefresh<T>(requestFactory: () => Observable<T>) {
    return requestFactory().pipe(
      catchError(error => {
        if (error?.status !== 401) {
          return throwError(() => error);
        }

        return this.refreshAccessToken().pipe(
          switchMap(() => requestFactory())
        );
      })
    );
  }

  private optionalAuthHeaders(): HttpHeaders | undefined {
    const token = this.getToken();
    return token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;
  }

  // ---------- Logout ----------
logout(triggerFaceRecovery: boolean = false): void {
  const user = this.getCurrentUserValue();
  const wasPatient = user?.role === 'PATIENT';

    if (this.isBrowser) {
      this.clearStoredSession();

      // Clear only transient onboarding flags. Assessment results are scoped per user.
    localStorage.removeItem('showAlzheimerAssessment');
    localStorage.removeItem('showWelcomeFlow');
    localStorage.removeItem('showPostMedicalWelcome');
    localStorage.removeItem('alzAssessmentReturnTo');

    if (wasPatient && triggerFaceRecovery && user?.keycloakId) {
      localStorage.setItem('face_recovery_keycloakId', user.keycloakId);
      localStorage.setItem('face_recovery_email', user.email || '');
      localStorage.setItem('face_recovery_active', 'true');
      localStorage.setItem('face_recovery_since', Date.now().toString());
    }
  }

  this.currentUserSubject.next(null);
  this.router.navigate(['/login']);
}

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private loadStoredUser(): void {
    if (this.isBrowser) {
      if (!this.getToken()) {
        localStorage.removeItem('current_user');
        return;
      }

      const storedUser = localStorage.getItem('current_user');
      if (storedUser) {
        this.currentUserSubject.next(this.normalizeUser(JSON.parse(storedUser)));
      }
    }
  }

  // ---------- Profile endpoints ----------
  updateProfile(data: UpdateUserRequest): Observable<any> {
    return this.retryAfterRefresh(() => this.http.put<any>(`${this.usersUrl}/profile`, data));
  }

  assignDoctorToPatient(patientId: string, doctorEmail: string): Observable<any> {
    return this.retryAfterRefresh(() =>
      this.http.put<any>(`${this.usersUrl}/patients/${patientId}/doctor`, { doctorEmail })
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<any> {
    return this.http.put(`${this.usersUrl}/change-password`, data);
  }

  sendPasswordResetCode(email: string, verificationMethod: VerificationMethod = 'email'): Observable<{ message: string; destination?: string }> {
    return this.http.post<{ message: string; destination?: string }>(`${this.apiUrl}/password-reset/send`, { email, verificationMethod });
  }

  confirmPasswordReset(data: PasswordResetConfirmRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/password-reset/confirm`, data);
  }

  submitAlzheimerAssessment<T>(payload: unknown): Observable<T> {
    return this.retryAfterRefresh(() =>
      this.http.post<T>(`${this.assessmentUrl}/predict`, payload)
    );
  }

  submitAlzheimerAssessmentForPatient<T>(patientId: string, payload: unknown): Observable<T> {
    return this.retryAfterRefresh(() =>
      this.http.post<T>(`${this.assessmentUrl}/patient/${encodeURIComponent(patientId)}/predict`, payload)
    );
  }

  getLatestAlzheimerAssessment<T>(): Observable<T | null> {
    return this.retryAfterRefresh(() =>
      this.http.get<T>(`${this.assessmentUrl}/latest`).pipe(
        catchError(error => error?.status === 204 ? of(null) : throwError(() => error))
      )
    );
  }

  getPatientAlzheimerAssessment<T>(patientId: string): Observable<T | null> {
    return this.retryAfterRefresh(() =>
      this.http.get<T>(`${this.assessmentUrl}/patient/${encodeURIComponent(patientId)}`).pipe(
        catchError(error => error?.status === 204 ? of(null) : throwError(() => error))
      )
    );
  }

  deleteAccount(): Observable<any> {
    return this.retryAfterRefresh(() => this.http.delete(`${this.usersUrl}/profile`));
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

  sendEmailVerificationCode(): Observable<{ message: string }> {
    return this.retryAfterRefresh(() =>
      this.http.post<{ message: string }>(`${this.usersUrl}/email-verification/send`, {})
    );
  }

  verifyEmailCode(code: string): Observable<{ message: string; user: User }> {
    return this.retryAfterRefresh(() =>
      this.http.post<{ message: string; user: User }>(`${this.usersUrl}/email-verification/verify`, { code }).pipe(
        tap(response => {
          if (response.user) {
            this.setCurrentUser(response.user);
          }
        })
      )
    );
  }

  sendEmailChangePhoneCode(newEmail: string, phoneNumber?: string, verificationMethod: VerificationMethod = 'phone'): Observable<{ message: string; destination?: string; method?: string }> {
    return this.retryAfterRefresh(() =>
      this.http.post<{ message: string; destination?: string; method?: string }>(`${this.usersUrl}/email-change/send-phone-code`, { newEmail, phoneNumber, verificationMethod })
    );
  }

  confirmEmailChange(data: EmailChangeConfirmRequest): Observable<{ message: string; user: User }> {
    const previousEmail = this.getCurrentUserValue()?.email;
    return this.retryAfterRefresh(() =>
      this.http.post<{ message: string; user: User }>(`${this.usersUrl}/email-change/confirm`, data).pipe(
        tap(response => {
          if (response.user) {
            this.setCurrentUser(response.user);
            this.syncCommunicationEmailReferences(previousEmail, response.user.email);
          }
        })
      )
    );
  }

  searchUsersByRole(term: string, role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.usersUrl}/search`, {
      params: { q: term, role },
      headers: this.optionalAuthHeaders()
    });
  }

  getUserByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/by-email`, {
      params: { email },
      headers: this.optionalAuthHeaders()
    }).pipe(
      catchError(err => {
        if (err?.status === 503 || err?.status === 502 || err?.status === 504) {
          return this.http.get<User>(`${this.directUsersUrl}/by-email`, {
            params: { email },
            headers: this.optionalAuthHeaders()
          });
        }
        return throwError(() => err);
      })
    );
  }

  private syncCommunicationEmailReferences(oldEmail?: string, newEmail?: string): void {
    const previous = (oldEmail || '').trim().toLowerCase();
    const next = (newEmail || '').trim().toLowerCase();
    if (!previous || !next || previous === next) return;
    this.rememberPendingCommunicationEmailSync(previous, next);

    this.http.post<void>(
      `${this.communicationApiUrl}/internal/email-reference-update`,
      { oldEmail: previous, newEmail: next },
      { headers: this.optionalAuthHeaders() }
    ).pipe(
      catchError(() =>
        this.http.post<void>(
          'http://localhost:8086/api/internal/email-reference-update',
          { oldEmail: previous, newEmail: next },
          { headers: this.optionalAuthHeaders() }
        )
      )
    ).subscribe({
      next: () => this.forgetPendingCommunicationEmailSync(previous, next),
      error: () => undefined
    });
  }

  private rememberPendingCommunicationEmailSync(oldEmail: string, newEmail: string): void {
    if (!this.isBrowser) return;
    const pending = this.getPendingCommunicationEmailSyncs();
    pending.set(`${oldEmail}->${newEmail}`, { oldEmail, newEmail });
    localStorage.setItem('evercare_pending_chat_email_syncs', JSON.stringify([...pending.values()]));
  }

  private forgetPendingCommunicationEmailSync(oldEmail: string, newEmail: string): void {
    if (!this.isBrowser) return;
    const pending = this.getPendingCommunicationEmailSyncs();
    pending.delete(`${oldEmail}->${newEmail}`);
    localStorage.setItem('evercare_pending_chat_email_syncs', JSON.stringify([...pending.values()]));
  }

  private retryPendingCommunicationEmailSync(): void {
    if (!this.isBrowser) return;
    this.getPendingCommunicationEmailSyncs().forEach(({ oldEmail, newEmail }) => {
      this.syncCommunicationEmailReferences(oldEmail, newEmail);
    });
  }

  private getPendingCommunicationEmailSyncs(): Map<string, { oldEmail: string; newEmail: string }> {
    if (!this.isBrowser) return new Map();
    try {
      const rows = JSON.parse(localStorage.getItem('evercare_pending_chat_email_syncs') || '[]') as Array<{ oldEmail: string; newEmail: string }>;
      return new Map(rows
        .filter(row => row?.oldEmail && row?.newEmail)
        .map(row => [`${row.oldEmail}->${row.newEmail}`, row]));
    } catch {
      return new Map();
    }
  }

  // ---------- Google login ----------
  googleLogin(idToken: string, role: string): Observable<GoogleLoginResult> {
    const body = { credential: idToken, role };

    return this.http.post<FaceLoginResponse>(`${this.apiUrl}/google`, body).pipe(
      switchMap(response =>
        this.completeFaceLogin(response).pipe(
          map(user => ({ user, isNewUser: response.isNewUser }))
        )
      ),
      catchError(error => {
        console.error('Google login error', error);
        return throwError(() => error);
      })
    );
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: User): void {
    const normalizedUser = this.normalizeUser(user);
    this.currentUserSubject.next(normalizedUser);
    if (this.isBrowser) {
      localStorage.setItem('current_user', JSON.stringify(normalizedUser));
    }
  }

  private clearStoredSession(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
  }

  private normalizeUser(user: User): User {
    const verified = user.isVerified ?? user.verified ?? false;
    const doctorEmails = this.normalizeDoctorEmails(user);
    return {
      ...user,
      doctorEmails,
      doctorEmail: doctorEmails[0] || user.doctorEmail,
      isVerified: verified,
      verified
    };
  }

  private normalizeEmail(email?: string | null): string {
    return String(email || '').trim().toLowerCase();
  }

  private normalizeDoctorEmails(user: User): string[] {
    const emails = [
      user.doctorEmail,
      ...(Array.isArray(user.doctorEmails) ? user.doctorEmails : [])
    ]
      .map(email => this.normalizeEmail(email))
      .filter(Boolean);

    return [...new Set(emails)];
  }
}
