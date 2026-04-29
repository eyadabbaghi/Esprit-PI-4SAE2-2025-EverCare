import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CameraService } from '../../services/camera/camera.service';
import { FaceService } from '../../services/camera/face.service';

type SetupState = 'instructions' | 'scanning' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-face-setup',
  templateUrl: './face-setup.component.html',
  styleUrls: ['./face-setup.component.scss']
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
    'Tilt your head slightly up'
  ];

  private capturedImages: string[] = [];
  private captureInterval: any;

  constructor(
    private camera: CameraService,
    private faceService: FaceService,
    private router: Router,
    private cdr: ChangeDetectorRef   // ← inject this
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.camera.stopCamera();
    clearInterval(this.captureInterval);
  }

  async startSetup(): Promise<void> {
    this.capturedImages = [];
    this.capturedCount = 0;
    this.progressPercent = 0;

    // Step 1: change state so *ngIf renders the video element
    this.state = 'scanning';

    // Step 2: force change detection so DOM updates
    this.cdr.detectChanges();

    // Step 3: wait one tick for the DOM to fully render
    await this.waitForElement();

    // Step 4: now videoRef.nativeElement exists — start camera
    try {
      await this.camera.startCamera(this.videoRef.nativeElement);
      this.autoCaptureFrames();
    } catch (err: any) {
      this.errorMessage = 'Camera access denied. Please allow camera permissions.';
      this.state = 'error';
    }
  }

  // Waits until videoRef is available in the DOM
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

  private autoCaptureFrames(): void {
  let captureIndex = 0;

  // Wait 3 seconds before first capture so camera adjusts exposure
  setTimeout(() => {
    this.captureInterval = setInterval(() => {
      if (captureIndex >= this.totalRequired) {
        clearInterval(this.captureInterval);
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
    }, 3000); // 3 seconds between each capture
  }, 3000); // 3 second initial delay
}

  private submitEmbeddings(): void {
    this.state = 'processing';
    this.camera.stopCamera();

    this.faceService.setupFaceId(this.capturedImages).subscribe({
      next: () => {
        this.state = 'success';
        setTimeout(() => this.router.navigate(['/']), 2500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Face setup failed. Please try again.';
        this.state = 'error';
      }
    });
  }

  retry(): void {
    this.state = 'instructions';
    this.capturedImages = [];
    this.capturedCount = 0;
    this.progressPercent = 0;
    clearInterval(this.captureInterval);
  }

  skip(): void {
    this.router.navigate(['/']);
  }
}