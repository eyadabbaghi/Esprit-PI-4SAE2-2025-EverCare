import { Component, OnDestroy, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { CameraService } from '../../services/camera/camera.service';
import { FaceService } from '../../services/camera/face.service';
import { AuthService } from '../login/auth.service';

type SetupState = 'instructions' | 'scanning' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-face-setup',
  templateUrl: './face-setup.component.html',
  styleUrls: ['./face-setup.component.scss'],
})
export class FaceSetupComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  state: SetupState = 'instructions';
  capturedCount = 0;
  totalRequired = 4;
  errorMessage = '';
  progressPercent = 0;

  instructions = [
    'Look straight at the camera',
    'Slowly turn your head left',
    'Slowly turn your head right',
    'Tilt your head slightly up',
  ];

  private capturedImages: string[] = [];
  private captureInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly camera: CameraService,
    private readonly faceService: FaceService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.camera.stopCamera();
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }
  }

  async startSetup(): Promise<void> {
    this.capturedImages = [];
    this.capturedCount = 0;
    this.progressPercent = 0;
    this.state = 'scanning';
    this.cdr.detectChanges();

    await this.waitForElement();

    try {
      await this.camera.startCamera(this.videoRef.nativeElement);
      this.autoCaptureFrames();
    } catch {
      this.errorMessage = 'Camera access denied. Please allow camera permissions.';
      this.state = 'error';
    }
  }

  retry(): void {
    this.state = 'instructions';
    this.capturedImages = [];
    this.capturedCount = 0;
    this.progressPercent = 0;
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }

  skip(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
      this.preparePostFaceOnboarding(user?.role);
      this.router.navigate([this.resolveDestination(user?.role)]);
    });
  }

  private waitForElement(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.videoRef?.nativeElement) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  private autoCaptureFrames(): void {
    let captureIndex = 0;

    setTimeout(() => {
      this.captureInterval = setInterval(() => {
        if (captureIndex >= this.totalRequired) {
          if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
          }
          this.submitEmbeddings();
          return;
        }

        try {
          const frame = this.camera.captureFrame(this.videoRef.nativeElement);
          this.capturedImages.push(frame);
          this.capturedCount++;
          this.progressPercent = (this.capturedCount / this.totalRequired) * 100;
          captureIndex++;
        } catch (err) {
          console.error('Capture error:', err);
        }
      }, 3000);
    }, 3000);
  }

  private submitEmbeddings(): void {
    this.state = 'processing';
    this.camera.stopCamera();

    this.faceService.setupFaceId(this.capturedImages).subscribe({
      next: () => {
        this.state = 'success';
        this.authService.currentUser$.pipe(take(1)).subscribe((user) => {
          const destination = this.resolveDestination(user?.role);
          this.preparePostFaceOnboarding(user?.role);
          setTimeout(() => this.router.navigate([destination]), 2000);
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Face setup failed. Please try again.';
        this.state = 'error';
      },
    });
  }

  private resolveDestination(role?: string): string {
    const returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    if (returnTo === 'profile') {
      return '/profile';
    }

    const isOnboarding = this.route.snapshot.queryParamMap.get('mode') === 'onboarding';
    if (isOnboarding && role === 'PATIENT') {
      localStorage.setItem('showAlzheimerAssessment', 'true');
      localStorage.setItem('showWelcomeFlow', 'true');
      localStorage.removeItem('alzAssessmentReturnTo');
      return '/';
    }

    return '/';
  }

  private preparePostFaceOnboarding(role?: string): void {
    const isOnboarding = this.route.snapshot.queryParamMap.get('mode') === 'onboarding';
    if (isOnboarding && (role === 'DOCTOR' || role === 'CAREGIVER')) {
      localStorage.setItem('showWelcomeFlow', 'true');
    }
  }
}
