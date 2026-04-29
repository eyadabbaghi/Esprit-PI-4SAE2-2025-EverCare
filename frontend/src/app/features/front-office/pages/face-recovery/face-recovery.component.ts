import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, ChangeDetectorRef,
  Inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CameraService } from '../../services/camera/camera.service';
import { FaceService } from '../../services/camera/face.service';
import { AuthService, FaceLoginResponse } from '../login/auth.service';
import { InactivityService } from '../services/inactivity/inactivity.service';

type RecoveryState = 'waiting' | 'scanning' | 'processing' | 'success';

@Component({
  selector: 'app-face-recovery',
  templateUrl: './face-recovery.component.html',
  styleUrls: ['./face-recovery.component.scss']
})
export class FaceRecoveryComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  state: RecoveryState = 'waiting';
  scanAttempts = 0;
  lastScore = 0;

  private keycloakId = '';
  private email = '';
  private scanLoopActive = false;
  private audioCtx: AudioContext | null = null;
  private beepIntervalId: any = null;

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
    // Guard against SSR — localStorage doesn't exist on the server
    if (!isPlatformBrowser(this.platformId)) return;

    this.keycloakId = localStorage.getItem('face_recovery_keycloakId') || '';
    this.email      = localStorage.getItem('face_recovery_email') || '';

    if (!this.keycloakId) {
      this.router.navigate(['/login']);
      return;
    }

    this.startAlarm();
    setTimeout(() => this.startCameraAndScan(), 500);
  }

  ngOnDestroy(): void {
    this.scanLoopActive = false;
    this.stopAlarm();
    this.camera.stopCamera();
  }

  async startCameraAndScan(): Promise<void> {
    this.state = 'scanning';
    this.cdr.detectChanges();

    await this.waitForVideoElement();

    try {
      await this.camera.startCamera(this.videoRef.nativeElement);
      this.scanLoopActive = true;
      this.runScanLoop();
    } catch {
      this.state = 'waiting';
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

    this.state = 'processing';
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
            this.state = 'success';
            this.cdr.detectChanges();
            setTimeout(() => this.router.navigate(['/']), 1500);
          },
          error: () => {
            this.state = 'waiting';
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.scanAttempts++;
        this.lastScore = err.error?.score || 0;
        this.state = 'scanning';
        this.cdr.detectChanges();

        if (this.scanLoopActive) {
          setTimeout(() => this.runScanLoop(), 1500);
        }
      }
    });
  }

  goToPasswordLogin(): void {
    this.scanLoopActive = false;
    this.stopAlarm();
    this.camera.stopCamera();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('face_recovery_keycloakId');
      localStorage.removeItem('face_recovery_email');
      localStorage.removeItem('face_recovery_active');
      localStorage.removeItem('face_recovery_since');
    }
    this.router.navigate(['/login']);
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
}
