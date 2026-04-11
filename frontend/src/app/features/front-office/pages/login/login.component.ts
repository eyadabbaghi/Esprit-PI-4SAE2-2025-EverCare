import { Component, NgZone, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, LoginRequest, RegisterRequest } from './auth.service';

// Custom validator for password strength (matches backend rules)
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

// Extend Window interface to include our callback
declare global {
  interface Window {
    handleGoogleResponse: (response: any) => void;
  }
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  isLoading = false;
  activeTab: 'login' | 'register' = 'login';

  loginForm!: FormGroup;
  registerForm!: FormGroup;

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
    @Inject(PLATFORM_ID) private platformId: Object   // <-- add this
  ) {}

  ngOnInit(): void {
    this.initForms();

    // Only define the global callback in the browser (not during SSR)
    if (isPlatformBrowser(this.platformId)) {
      window.handleGoogleResponse = (response) => {
        this.ngZone.run(() => {
          this.handleGoogleCredential(response.credential);
        });
      };
    }
  }

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
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const credentials: LoginRequest = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.toastr.success('Login successful!', 'Welcome');
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Login error', err);
        const errorMsg = err.error?.message || 'Login failed. Please check your credentials.';
        this.toastr.error(errorMsg, 'Error');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  handleRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const userData: RegisterRequest = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: () => {
        // Registration and automatic login succeeded – now navigate
        this.router.navigate(['/setup-profile'], {
          state: {
            name: userData.name,
            email: userData.email,
            role: userData.role
          }
        });
      },
      error: (err) => {
        console.error('Registration error', err);
        const errorMsg = err.error?.message || 'Registration failed. Please try again.';
        this.toastr.error(errorMsg, 'Error');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // Called when the user clicks the custom Google button (if you keep it)
  handleGoogleLogin(): void {
    this.toastr.info('Please use the official Google Sign‑In button', 'Info');
  }

  // Actual handler for the credential received from Google
  handleGoogleCredential(idToken: string): void {
    this.isLoading = true;
    this.authService.googleLogin(idToken).subscribe({
      next: () => {
        this.toastr.success('Login successful!', 'Welcome');
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Google login failed');
        this.isLoading = false;
      }
    });
  }

  // Password strength meter helpers
  getPasswordStrength(): { level: number, message: string } {
    const password = this.registerForm?.get('password')?.value || '';
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*()]/.test(password)
    ];
    const strengthLevel = checks.filter(Boolean).length;

    let message = '';
    if (strengthLevel === 0) message = 'Very weak';
    else if (strengthLevel === 1) message = 'Weak';
    else if (strengthLevel === 2) message = 'Fair';
    else if (strengthLevel === 3) message = 'Good';
    else message = 'Strong';

    return { level: strengthLevel, message };
  }

  getStrengthPercentage(): number {
    return (this.getPasswordStrength().level / 4) * 100;
  }

  getStrengthColor(): string {
    const level = this.getPasswordStrength().level;
    if (level === 0) return 'bg-red-500';
    if (level === 1) return 'bg-orange-500';
    if (level === 2) return 'bg-yellow-500';
    if (level === 3) return 'bg-green-400';
    return 'bg-green-600';
  }

  hasMinLength(): boolean {
    const password = this.registerForm?.get('password')?.value;
    return password && password.length >= 8;
  }

  hasUpperCase(): boolean {
    const password = this.registerForm?.get('password')?.value;
    return password && /[A-Z]/.test(password);
  }

  hasDigit(): boolean {
    const password = this.registerForm?.get('password')?.value;
    return password && /\d/.test(password);
  }

  hasSpecialChar(): boolean {
    const password = this.registerForm?.get('password')?.value;
    return password && /[!@#$%^&*()]/.test(password);
  }

  get lf() { return this.loginForm.controls; }
  get rf() { return this.registerForm.controls; }


  goToFaceLogin(): void {
  this.router.navigate(['/face-login']);
}
}