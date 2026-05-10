/**
 * LoginComponent - Login and Registration page
 *
 * CHANGED: Converted to standalone component to fix NG8002 formGroup error.
 * Previously was declared in FrontOfficeModule but needed ReactiveFormsModule
 * imported directly in the component for formGroup directive to work.
 *
 * Changes made:
 * - Added `standalone: true` to @Component decorator
 * - Added `imports: [CommonModule, ReactiveFormsModule]` to import required modules
 * - Updated front-office-routing.module.ts to use loadComponent instead of direct import
 * - Removed from FrontOfficeModule declarations array
 */
import { Component, NgZone, OnInit, OnDestroy, Inject, PLATFORM_ID, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, FaceLoginResponse, LoginRequest, RegisterRequest, User, VerificationMethod } from './auth.service';
import { FaceService } from '../../services/camera/face.service';
import { CameraService } from '../../services/camera/camera.service';
import { InactivityService } from '../services/inactivity/inactivity.service';

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;
    if (!password) return null;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const isValidLength = password.length >= 8;
    const valid = hasLowerCase && hasUpperCase && hasDigit && hasSpecial && isValidLength;
    return !valid ? { weakPassword: true } : null;
  };
}

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

declare global {
  interface Window {
    handleGoogleResponse: (response: any) => void;
    google?: any;
  }
}

type RecoveryState = 'scanning' | 'processing' | 'success';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  isLoading = false;
  activeTab: 'login' | 'register' = 'login';

  loginForm!: FormGroup;
  registerForm!: FormGroup;

  // Face recovery
  showFaceRecovery = false;
  recoveryState: RecoveryState = 'scanning';
  recoveryAttempts = 0;
  private keycloakId = '';
  private scanLoopActive = false;
  private audioCtx: AudioContext | null = null;
  private beepIntervalId: any = null;
  private readonly rememberedLoginKey = 'evercare_remembered_login';
  private readonly googleClientId = '701632621274-bbb8eau1rg0vv6c78c17sp02qm271h9k.apps.googleusercontent.com';
  private googleInitTimer: any = null;
  authPopup: { type: 'success' | 'error' | 'info'; title: string; message: string } | null = null;
  private authPopupTimer: any = null;
  showPasswordResetModal = false;
  passwordResetStep: 'email' | 'code' | 'password' | 'success' = 'email';
  resetEmail = '';
  resetCode = '';
  resetNewPassword = '';
  resetConfirmPassword = '';
  resetVerificationMethod: VerificationMethod = 'email';
  resetDestination = '';
  isPasswordResetBusy = false;
  passwordResetCountdown = 0;
  private passwordResetTimer: any = null;
  showRolePicker = false;

  userRoles = [
    { value: 'PATIENT', label: 'Patient', description: 'Track your health, care routine, and support circle.' },
    { value: 'CAREGIVER', label: 'Caregiver', description: 'Support an associated patient and coordinate daily care.' },
    { value: 'DOCTOR', label: 'Doctor', description: 'Follow patients, appointments, records, and clinical care.' },

  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private faceService: FaceService,
    private camera: CameraService,
    private inactivityService: InactivityService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.initForms();

    if (isPlatformBrowser(this.platformId)) {
      // Check if we should show face recovery panel
      const isRecoveryActive = localStorage.getItem('face_recovery_active') === 'true';
      this.keycloakId = localStorage.getItem('face_recovery_keycloakId') || '';

      if (isRecoveryActive && this.keycloakId) {
        this.inactivityService.stopLogoutWatcher();
        this.showFaceRecovery = true;
        this.startAlarm();
        setTimeout(() => this.startRecoveryScan(), 500);
      }

      setTimeout(() => this.initializeGoogleSignUp(), 0);
    }
  }

  ngOnDestroy(): void {
    this.scanLoopActive = false;
    this.stopAlarm();
    this.camera.stopCamera();
    if (this.googleInitTimer) {
      clearTimeout(this.googleInitTimer);
    }
    if (this.authPopupTimer) {
      clearTimeout(this.authPopupTimer);
    }
    this.clearPasswordResetCountdown();
  }

  // ── Face Recovery ─────────────────────────────────────────────

  async startRecoveryScan(): Promise<void> {
    this.recoveryState = 'scanning';
    this.cdr.detectChanges();
    await this.waitForVideoElement();

    try {
      await this.camera.startCamera(this.videoRef.nativeElement);
      this.scanLoopActive = true;
      this.runScanLoop();
    } catch {
      this.cdr.detectChanges();
    }
  }

  private runScanLoop(): void {
    if (!this.scanLoopActive) return;

    let frame: string;
    try {
      frame = this.camera.captureFrame(this.videoRef.nativeElement);
    } catch {
      setTimeout(() => this.runScanLoop(), 1000);
      return;
    }

    this.recoveryState = 'processing';
    this.cdr.detectChanges();

    this.faceService.faceLogin(this.keycloakId, frame).subscribe({
      next: (res: FaceLoginResponse) => {
        this.scanLoopActive = false;
        this.camera.stopCamera();
        this.stopAlarm();

        localStorage.removeItem('face_recovery_keycloakId');
        localStorage.removeItem('face_recovery_email');
        localStorage.removeItem('face_recovery_active');
        localStorage.removeItem('face_recovery_since');

        this.authService.completeFaceLogin(res).subscribe({
          next: () => {
            this.inactivityService.stopLogoutWatcher();
            this.recoveryState = 'success';
            this.cdr.detectChanges();
            setTimeout(() => {
              this.ngZone.run(() => this.navigateAfterLogin(this.authService.getCurrentUserValue()));
            }, 1500);
          },
          error: () => {
            this.toastr.error('Face login could not create a valid session. Please try password login.', 'Session error');
            this.dismissFaceRecovery();
          }
        });
      },
      error: () => {
        this.recoveryAttempts++;
        this.recoveryState = 'scanning';
        this.cdr.detectChanges();
        if (this.scanLoopActive) {
          setTimeout(() => this.runScanLoop(), 1500);
        }
      }
    });
  }

  dismissFaceRecovery(): void {
    this.scanLoopActive = false;
    this.stopAlarm();
    this.camera.stopCamera();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('face_recovery_keycloakId');
      localStorage.removeItem('face_recovery_email');
      localStorage.removeItem('face_recovery_active');
      localStorage.removeItem('face_recovery_since');
    }
    this.showFaceRecovery = false;
    this.cdr.detectChanges();
  }

  // ── Alarm ─────────────────────────────────────────────────────

  private startAlarm(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.beepIntervalId = setInterval(() => this.playBeep(), 800);
  }

  private playBeep(): void {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.4);
    osc.start(this.audioCtx.currentTime);
    osc.stop(this.audioCtx.currentTime + 0.4);
  }

  private stopAlarm(): void {
    if (this.beepIntervalId) { clearInterval(this.beepIntervalId); this.beepIntervalId = null; }
    if (this.audioCtx) { this.audioCtx.close(); this.audioCtx = null; }
  }

  private waitForVideoElement(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.videoRef?.nativeElement) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }

  // ── Existing login/register logic (unchanged) ─────────────────

  private initForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });

    this.registerForm = this.fb.group(
      {
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, strongPasswordValidator()]],
        confirmPassword: ['', Validators.required],
        role: ['PATIENT', Validators.required]
      },
      { validators: passwordMatchValidator() }
    );

    this.loadRememberedLogin();
  }

  onTabChange(tab: 'login' | 'register'): void {
    this.activeTab = tab;
    this.showRolePicker = false;
    if (tab === 'register' && isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initializeGoogleSignUp(), 0);
    }
  }

  handleLogin(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.isLoading = true;
    const { email, password, rememberMe } = this.loginForm.value;
    const credentials: LoginRequest = { email, password };
    this.authService.login(credentials).subscribe({
      next: (user) => {
        this.saveRememberedLogin(email, password, rememberMe);
        this.toastr.success('Login successful!', 'Welcome');
        this.showAuthMessage('success', 'Welcome back', 'You are signed in successfully.');
        this.navigateAfterLogin(user);
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Login failed. Please check your credentials.';
        this.showAuthMessage('error', 'Login failed', errorMsg);
        this.toastr.error(errorMsg, 'Error');
        this.isLoading = false;
      },
      complete: () => { this.isLoading = false; }
    });
  }

 handleRegister(): void {
  if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
  this.isLoading = true;

  // Clear transient onboarding flags from any previous session.
  localStorage.removeItem('showAlzheimerAssessment');
  localStorage.removeItem('showWelcomeFlow');
  localStorage.removeItem('showPostMedicalWelcome');
  localStorage.removeItem('alzAssessmentReturnTo');

  const { name, email, password, role } = this.registerForm.value;
  const userData: RegisterRequest = { name, email, password, role };
  this.authService.register(userData).subscribe({
    next: () => {
      this.showAuthMessage('success', 'Account created', 'Your account is ready. Complete your profile next.');
      this.router.navigate(['/setup-profile'], {
        state: { name: userData.name, email: userData.email, role: userData.role }
      });
    },
    error: (err) => {
      const errorMsg = err.error?.message || 'Registration failed. Please try again.';
      this.showAuthMessage('error', err.status === 409 ? 'Email already exists' : 'Sign up failed', errorMsg);
      this.toastr.error(errorMsg, 'Error');
      this.isLoading = false;
    },
    complete: () => { this.isLoading = false; }
  });
}

  handleGoogleLogin(): void {
    this.toastr.info('Please use the official Google Sign‑In button', 'Info');
  }

  handleGoogleCredential(idToken: string): void {
    this.isLoading = true;
    const role = this.registerForm.get('role')?.value || 'PATIENT';
    this.authService.googleLogin(idToken, role).subscribe({
      next: ({ user, isNewUser }) => {
        this.toastr.success(isNewUser ? 'Google signup successful!' : 'Google login successful!', 'Welcome');
        if (isNewUser && user.role !== 'ADMIN') {
          this.router.navigate(['/setup-profile'], {
            state: {
              name: user.name,
              email: user.email,
              role: user.role,
              profilePicture: user.profilePicture
            }
          });
          return;
        }
        this.navigateAfterLogin(user);
      },
      error: (err) => { this.toastr.error('Google login failed'); this.isLoading = false; }
    });
  }

  openPasswordReset(): void {
    this.showPasswordResetModal = true;
    this.passwordResetStep = 'email';
    this.resetEmail = this.loginForm.get('email')?.value || '';
    this.resetCode = '';
    this.resetNewPassword = '';
    this.resetConfirmPassword = '';
    this.resetVerificationMethod = 'email';
    this.resetDestination = '';
    this.isPasswordResetBusy = false;
    this.clearPasswordResetCountdown();
  }

  closePasswordReset(): void {
    this.showPasswordResetModal = false;
    this.isPasswordResetBusy = false;
    this.clearPasswordResetCountdown();
  }

  sendPasswordResetCode(): void {
    const email = this.resetEmail.trim();
    if (!email || this.passwordResetCountdown > 0 || this.isPasswordResetBusy) {
      if (!email) this.showAuthMessage('error', 'Email required', 'Enter the email linked to your account.');
      return;
    }

    this.isPasswordResetBusy = true;
    this.authService.sendPasswordResetCode(email, this.resetVerificationMethod).subscribe({
      next: (response) => {
        this.resetDestination = response.destination || (this.resetVerificationMethod === 'recovery-email' ? 'your recovery email' : email);
        this.passwordResetStep = 'code';
        this.startPasswordResetCountdown();
        this.showAuthMessage('success', 'Code sent', `Check ${this.resetDestination} for the 6-digit reset code.`);
        this.isPasswordResetBusy = false;
      },
      error: (err) => {
        const message = err?.error?.message || 'Could not send password reset code.';
        this.showAuthMessage('error', 'Reset failed', message);
        this.isPasswordResetBusy = false;
      }
    });
  }

  continuePasswordResetCode(): void {
    if (!/^\d{6}$/.test(this.resetCode.trim())) {
      this.showAuthMessage('error', 'Invalid code', 'Enter the 6-digit code from your selected verification method.');
      return;
    }
    this.passwordResetStep = 'password';
  }

  confirmPasswordReset(): void {
    if (!/^\d{6}$/.test(this.resetCode.trim())) {
      this.passwordResetStep = 'code';
      this.showAuthMessage('error', 'Invalid code', 'Enter the 6-digit code from your selected verification method.');
      return;
    }
    if (this.resetNewPassword !== this.resetConfirmPassword) {
      this.showAuthMessage('error', 'Passwords do not match', 'Confirm your new password before saving.');
      return;
    }
    if (this.getPasswordScore(this.resetNewPassword) < 5) {
      this.showAuthMessage('error', 'Password too weak', 'Use uppercase, lowercase, number, symbol, and at least 8 characters.');
      return;
    }

    this.isPasswordResetBusy = true;
    this.authService.confirmPasswordReset({
      email: this.resetEmail.trim(),
      code: this.resetCode.trim(),
      newPassword: this.resetNewPassword
    }).subscribe({
      next: () => {
        this.passwordResetStep = 'success';
        this.showAuthMessage('success', 'Password updated', 'You can sign in with your new password.');
        this.isPasswordResetBusy = false;
        setTimeout(() => {
          this.closePasswordReset();
          this.activeTab = 'login';
        }, 1600);
      },
      error: (err) => {
        const message = err?.error?.message || 'Password reset failed.';
        this.showAuthMessage('error', 'Reset failed', message);
        this.isPasswordResetBusy = false;
      }
    });
  }

  private startPasswordResetCountdown(): void {
    this.clearPasswordResetCountdown();
    this.passwordResetCountdown = 60;
    this.passwordResetTimer = setInterval(() => {
      this.passwordResetCountdown = Math.max(0, this.passwordResetCountdown - 1);
      if (this.passwordResetCountdown === 0) this.clearPasswordResetCountdown();
    }, 1000);
  }

  private clearPasswordResetCountdown(): void {
    if (this.passwordResetTimer) {
      clearInterval(this.passwordResetTimer);
      this.passwordResetTimer = null;
    }
  }

  private showAuthMessage(type: 'success' | 'error' | 'info', title: string, message: string): void {
    this.authPopup = { type, title, message };
    if (this.authPopupTimer) clearTimeout(this.authPopupTimer);
    this.authPopupTimer = setTimeout(() => this.authPopup = null, 3800);
  }

  get selectedRoleOption() {
    const value = this.registerForm?.get('role')?.value || 'PATIENT';
    return this.userRoles.find((role) => role.value === value) || this.userRoles[0];
  }

  toggleRolePicker(): void {
    this.showRolePicker = !this.showRolePicker;
  }

  selectRole(roleValue: string): void {
    this.registerForm.get('role')?.setValue(roleValue);
    this.showRolePicker = false;
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initializeGoogleSignUp(), 0);
    }
  }

  roleIconPath(roleValue: string): string {
    if (roleValue === 'CAREGIVER') {
      return 'M12 20s-7-4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6-7 10-7 10ZM7.5 14.5c1.3-1 2.8-1.5 4.5-1.5s3.2.5 4.5 1.5';
    }
    if (roleValue === 'DOCTOR') {
      return 'M8 4v5a4 4 0 0 0 8 0V4M6 4h4M14 4h4M12 13v2a4 4 0 0 0 8 0v-1M20 12a2 2 0 1 1 0 4';
    }
    return 'M7 20v-1.4A4.6 4.6 0 0 1 11.6 14h.8A4.6 4.6 0 0 1 17 18.6V20M8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0M18.5 8.5v4M16.5 10.5h4';
  }

  private initializeGoogleSignUp(retryCount = 0): void {
    if (!isPlatformBrowser(this.platformId) || this.activeTab !== 'register') {
      return;
    }

    const buttonHost = document.getElementById('google-signup-button');
    const google = window.google;

    if (!buttonHost || !google?.accounts?.id) {
      if (retryCount < 20) {
        this.googleInitTimer = setTimeout(() => this.initializeGoogleSignUp(retryCount + 1), 250);
      }
      return;
    }

    window.handleGoogleResponse = (response: any) => {
      const credential = response?.credential;
      if (!credential) {
        this.toastr.error('Google did not return a login credential.', 'Google login');
        return;
      }
      this.ngZone.run(() => this.handleGoogleCredential(credential));
    };

    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: window.handleGoogleResponse,
      ux_mode: 'popup'
    });

    buttonHost.innerHTML = '';
    google.accounts.id.renderButton(buttonHost, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'signup_with',
      logo_alignment: 'left',
      width: Math.min(buttonHost.clientWidth || 360, 400)
    });
  }

  private navigateAfterLogin(user: User | null): void {
    this.router.navigate([user?.role === 'ADMIN' ? '/admin' : '/']);
  }

  private loadRememberedLogin(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const rawCredentials = localStorage.getItem(this.rememberedLoginKey);
    if (!rawCredentials) {
      return;
    }

    try {
      const credentials = JSON.parse(rawCredentials) as Partial<LoginRequest>;
      if (credentials.email && credentials.password) {
        this.loginForm.patchValue({
          email: credentials.email,
          password: credentials.password,
          rememberMe: true
        });
      }
    } catch {
      localStorage.removeItem(this.rememberedLoginKey);
    }
  }

  private saveRememberedLogin(email: string, password: string, rememberMe: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!rememberMe) {
      localStorage.removeItem(this.rememberedLoginKey);
      return;
    }

    localStorage.setItem(this.rememberedLoginKey, JSON.stringify({ email, password }));
  }

  getPasswordStrength(): { level: number, message: string } {
    const password = this.registerForm?.get('password')?.value || '';
    const strengthLevel = this.getPasswordScore(password);
    const messages = ['Very weak', 'Weak', 'Fair', 'Good', 'Almost strong', 'Strong'];
    return { level: strengthLevel, message: messages[strengthLevel] };
  }

  getPasswordScore(password: string): number {
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ];
    return checks.filter(Boolean).length;
  }

  getStrengthPercentage(): number { return (this.getPasswordStrength().level / 5) * 100; }

  getResetPasswordStrength(): { level: number, message: string } {
    const strengthLevel = this.getPasswordScore(this.resetNewPassword || '');
    const messages = ['Very weak', 'Weak', 'Fair', 'Good', 'Almost strong', 'Strong'];
    return { level: strengthLevel, message: messages[strengthLevel] };
  }

  getResetStrengthPercentage(): number { return (this.getResetPasswordStrength().level / 5) * 100; }

  getResetStrengthClass(): string {
    const level = this.getResetPasswordStrength().level;
    if (level <= 2) return 'strength-weak';
    if (level <= 4) return 'strength-good';
    return 'strength-strong';
  }

  get resetPasswordConfirmationState(): 'idle' | 'match' | 'mismatch' {
    if (!this.resetNewPassword || !this.resetConfirmPassword) return 'idle';
    return this.resetNewPassword === this.resetConfirmPassword ? 'match' : 'mismatch';
  }

  get resetPasswordConfirmationProgress(): number {
    if (this.resetPasswordConfirmationState === 'idle') return 0;
    if (this.resetPasswordConfirmationState === 'match') return 100;
    const passwordLength = Math.max(this.resetNewPassword.length, 1);
    return Math.min(100, Math.max(18, (this.resetConfirmPassword.length / passwordLength) * 100));
  }

  getStrengthClass(): string {
    const level = this.getPasswordStrength().level;
    if (level <= 2) return 'strength-weak';
    if (level <= 4) return 'strength-good';
    return 'strength-strong';
  }

  hasMinLength(): boolean { const p = this.registerForm?.get('password')?.value; return p && p.length >= 8; }
  hasLowerCase(): boolean { const p = this.registerForm?.get('password')?.value; return p && /[a-z]/.test(p); }
  hasUpperCase(): boolean { const p = this.registerForm?.get('password')?.value; return p && /[A-Z]/.test(p); }
  hasDigit(): boolean { const p = this.registerForm?.get('password')?.value; return p && /\d/.test(p); }
  hasSpecialChar(): boolean { const p = this.registerForm?.get('password')?.value; return p && /[^A-Za-z0-9]/.test(p); }

  get passwordConfirmationState(): 'idle' | 'match' | 'mismatch' {
    const password = this.registerForm?.get('password')?.value;
    const confirmPassword = this.registerForm?.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return 'idle';
    }

    return password === confirmPassword ? 'match' : 'mismatch';
  }

  get passwordConfirmationProgress(): number {
    if (this.passwordConfirmationState === 'idle') {
      return 0;
    }

    if (this.passwordConfirmationState === 'match') {
      return 100;
    }

    const passwordLength = Math.max((this.registerForm?.get('password')?.value || '').length, 1);
    const confirmLength = (this.registerForm?.get('confirmPassword')?.value || '').length;
    return Math.min(100, Math.max(18, (confirmLength / passwordLength) * 100));
  }

  get lf() { return this.loginForm.controls; }
  get rf() { return this.registerForm.controls; }

  goToFaceLogin(): void { this.router.navigate(['/face-login']); }
}
