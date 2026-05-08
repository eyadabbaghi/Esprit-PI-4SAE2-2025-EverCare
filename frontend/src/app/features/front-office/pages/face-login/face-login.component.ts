import { Component, OnInit, OnDestroy, ViewChild, ElementRef, 
         ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CameraService } from '../../services/camera/camera.service';
import { FaceService } from '../../services/camera/face.service';
import { AuthService, FaceLoginResponse, User } from '../login/auth.service';
import { InactivityService } from '../services/inactivity/inactivity.service';

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
    private inactivityService: InactivityService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Stop the watcher immediately so it cannot redirect us away from this page
    this.inactivityService.stopLogoutWatcher();

    // Clear all recovery flags so the watcher won't re-trigger if restarted
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('face_recovery_keycloakId');
      localStorage.removeItem('face_recovery_email');
      localStorage.removeItem('face_recovery_active');
      localStorage.removeItem('face_recovery_since');
    }
  }

  ngOnDestroy(): void {
    this.camera.stopCamera();
    // Restart the watcher when leaving this page
    this.inactivityService.startLogoutWatcher();
  }

  async startFaceLogin(): Promise<void> {
    if (!this.email) return;
    this.errorMessage = '';

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

    this.state = 'scanning';
    this.cdr.detectChanges();
    await this.waitForElement();

    try {
      await this.camera.startCamera(this.videoRef.nativeElement);
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
      next: (res: FaceLoginResponse) => {
        this.state = 'success';
        this.authService.completeFaceLogin(res).subscribe({
          next: (user) => setTimeout(() => this.navigateAfterLogin(user), 1500),
          error: () => {
            this.errorMessage = 'Face recognized, but session creation failed. Please use password login.';
            this.state = 'failed';
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

  private navigateAfterLogin(user: User | null): void {
    this.router.navigate([user?.role === 'ADMIN' ? '/admin' : '/']);
  }
}
