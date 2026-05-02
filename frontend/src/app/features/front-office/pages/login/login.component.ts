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
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, FaceLoginResponse, LoginRequest, RegisterRequest } from './auth.service';
import { FaceService } from '../../services/camera/face.service';
import { CameraService } from '../../services/camera/camera.service';
import { InactivityService } from '../services/inactivity/inactivity.service';

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;
    if (!password) return null;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()]/.test(password);
    const isValidLength = password.length >= 8;
    const valid = hasUpperCase && hasDigit && hasSpecial && isValidLength;
    return !valid ? { weakPassword: true } : null;
  };
}

declare global {
  interface Window {
    handleGoogleResponse: (response: any) => void;
  }
}

type RecoveryState = 'scanning' | 'processing' | 'success';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
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

  userRoles = [
    { value: 'PATIENT', label: 'Patient' },
    { value: 'CAREGIVER', label: 'Caregiver' },
    { value: 'DOCTOR', label: 'Doctor' },

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
      window.handleGoogleResponse = (response) => {
        this.ngZone.run(() => this.handleGoogleCredential(response.credential));
      };

      // Check if we should show face recovery panel
      const isRecoveryActive = localStorage.getItem('face_recovery_active') === 'true';
      this.keycloakId = localStorage.getItem('face_recovery_keycloakId') || '';

      if (isRecoveryActive && this.keycloakId) {
        this.inactivityService.stopLogoutWatcher();
        this.showFaceRecovery = true;
        this.startAlarm();
        setTimeout(() => this.startRecoveryScan(), 500);
      }
    }
  }

  ngOnDestroy(): void {
    this.scanLoopActive = false;
    this.stopAlarm();
    this.camera.stopCamera();
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
              this.ngZone.run(() => this.router.navigate(['/']));
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
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, strongPasswordValidator()]],
      role: ['PATIENT', Validators.required]
    });
  }

  onTabChange(tab: 'login' | 'register'): void {
    this.activeTab = tab;
  }

  handleLogin(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.isLoading = true;
    const credentials: LoginRequest = this.loginForm.value;
    this.authService.login(credentials).subscribe({
      next: () => { this.toastr.success('Login successful!', 'Welcome'); this.router.navigate(['/']); },
      error: (err) => {
        const errorMsg = err.error?.message || 'Login failed. Please check your credentials.';
        this.toastr.error(errorMsg, 'Error');
        this.isLoading = false;
      },
      complete: () => { this.isLoading = false; }
    });
  }

  handleRegister(): void {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.isLoading = true;
    const userData: RegisterRequest = this.registerForm.value;
    this.authService.register(userData).subscribe({
      next: () => {
        this.router.navigate(['/setup-profile'], {
          state: { name: userData.name, email: userData.email, role: userData.role }
        });
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Registration failed. Please try again.';
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
    this.authService.googleLogin(idToken).subscribe({
      next: () => { this.toastr.success('Login successful!', 'Welcome'); this.router.navigate(['/']); },
      error: (err) => { this.toastr.error('Google login failed'); this.isLoading = false; }
    });
  }

  getPasswordStrength(): { level: number, message: string } {
    const password = this.registerForm?.get('password')?.value || '';
    const checks = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[!@#$%^&*()]/.test(password)];
    const strengthLevel = checks.filter(Boolean).length;
    const messages = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return { level: strengthLevel, message: messages[strengthLevel] };
  }

  getStrengthPercentage(): number { return (this.getPasswordStrength().level / 4) * 100; }

  getStrengthColor(): string {
    const level = this.getPasswordStrength().level;
    if (level === 0) return 'bg-red-500';
    if (level === 1) return 'bg-orange-500';
    if (level === 2) return 'bg-yellow-500';
    if (level === 3) return 'bg-green-400';
    return 'bg-green-600';
  }

  hasMinLength(): boolean { const p = this.registerForm?.get('password')?.value; return p && p.length >= 8; }
  hasUpperCase(): boolean { const p = this.registerForm?.get('password')?.value; return p && /[A-Z]/.test(p); }
  hasDigit(): boolean { const p = this.registerForm?.get('password')?.value; return p && /\d/.test(p); }
  hasSpecialChar(): boolean { const p = this.registerForm?.get('password')?.value; return p && /[!@#$%^&*()]/.test(p); }

  get lf() { return this.loginForm.controls; }
  get rf() { return this.registerForm.controls; }

  goToFaceLogin(): void { this.router.navigate(['/face-login']); }
}
