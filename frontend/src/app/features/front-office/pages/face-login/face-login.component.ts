import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CameraService } from '../../services/camera/camera.service';
import { FaceService } from '../../services/camera/face.service';
import { AuthService } from '../login/auth.service';

type LoginState = 'email-entry' | 'scanning' | 'processing' | 'success' | 'failed';

@Component({
  selector: 'app-face-login',
  templateUrl: './face-login.component.html',
  styleUrls: ['./face-login.component.scss']
})
export class FaceLoginComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  state: LoginState = 'email-entry';
  email = '';
  errorMessage = '';
  retryCount = 0;
  maxRetries = 3;
  private keycloakId = '';

  constructor(
    private camera: CameraService,
    private faceService: FaceService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.camera.stopCamera();
  }

  async startFaceLogin(): Promise<void> {
    if (!this.email) return;
    this.errorMessage = '';

    // 1. Get keycloakId from email (public endpoint — no token needed)
    try {
      const user = await this.faceService.getUserByEmail(this.email).toPromise();

      if (!user || !user.keycloakId) {
        this.errorMessage = 'No Face ID account found for that email.';
        return;
      }

      this.keycloakId = user.keycloakId;

    } catch (err: any) {
      if (err.status === 404) {
        this.errorMessage = 'No account found for that email.';
      } else if (err.status === 401) {
        this.errorMessage = 'Authentication error. Please contact support.';
      } else {
        this.errorMessage = 'Could not reach server. Please try again.';
      }
      return;
    }

    // 2. Change state so *ngIf renders the video element
    this.state = 'scanning';

    // 3. Force DOM update
    this.cdr.detectChanges();

    // 4. Wait for video element to appear in DOM
    await this.waitForElement();

    // 5. Start camera
    try {
      await this.camera.startCamera(this.videoRef.nativeElement);
      // Auto-capture after 2 seconds — let face settle in frame
      setTimeout(() => this.captureAndVerify(), 2000);
    } catch (err: any) {
      this.errorMessage = 'Camera access denied. Please allow camera permissions.';
      this.state = 'email-entry';
    }
  }

 private async captureAndVerify(): Promise<void> {
  this.state = 'processing';

  let frame: string;
  try {
    frame = this.camera.captureFrame(this.videoRef.nativeElement);
  } catch (err) {
    this.errorMessage = 'Failed to capture image. Please try again.';
    this.state = 'failed';
    return;
  }

  this.camera.stopCamera();

  this.faceService.faceLogin(this.keycloakId, frame).subscribe({
    next: (res: any) => {
      this.state = 'success';

      // Store token
      localStorage.setItem('auth_token', res.token);

      // ✅ Get user by email WITHOUT auth header (it's permitAll in SecurityConfig)
      // Pass the token explicitly so the interceptor doesn't interfere
      this.faceService.getUserByEmailNoAuth(this.email).subscribe({
        next: (user: any) => {
          localStorage.setItem('current_user', JSON.stringify(user));
          this.authService.setCurrentUser(user);
          setTimeout(() => this.router.navigate(['/']), 1500);
        },
        error: () => {
          setTimeout(() => this.router.navigate(['/']), 1500);
        }
      });
    },
    error: (err) => {
      this.retryCount++;
      this.errorMessage = err.error?.message || 'Face not recognized. Please try again.';
      this.state = 'failed';
    }
  });
}

  async retry(): Promise<void> {
    if (this.retryCount >= this.maxRetries) {
      this.router.navigate(['/login']);
      return;
    }

    this.errorMessage = '';
    this.state = 'scanning';

    // Same safe pattern — wait for DOM before accessing nativeElement
    this.cdr.detectChanges();
    await this.waitForElement();

    try {
      await this.camera.startCamera(this.videoRef.nativeElement);
      setTimeout(() => this.captureAndVerify(), 2000);
    } catch (err: any) {
      this.errorMessage = 'Camera access denied.';
      this.state = 'failed';
    }
  }

  goToPasswordLogin(): void {
    this.camera.stopCamera();
    this.router.navigate(['/login']);
  }

  // Polls until videoRef is available in the DOM
  private waitForElement(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.videoRef && this.videoRef.nativeElement) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }
}