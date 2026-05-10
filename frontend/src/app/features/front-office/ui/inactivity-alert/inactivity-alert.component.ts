import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { InactivityService } from '../../pages/services/inactivity/inactivity.service';
import { CameraService } from '../../services/camera/camera.service';
import { FaceService } from '../../services/camera/face.service';
import { AuthService } from '../../pages/login/auth.service';

type AlertState = 'hidden' | 'alert' | 'scanning' | 'processing' | 'recovered';

@Component({
  selector: 'app-inactivity-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="state !== 'hidden'">
      <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
           style="background: rgba(10,0,30,0.97);">

        <ng-container *ngIf="state === 'alert'">
          <div class="text-center space-y-6 p-8">
            <div class="text-6xl animate-bounce">!</div>
            <h1 class="text-4xl font-bold text-red-400">Inactivity Detected</h1>
            <p class="text-lg text-purple-200">
              You've been inactive for over 3 minutes.<br/>
              Please verify your identity to continue.
            </p>
            <button (click)="startScan()"
              class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-10 rounded-2xl text-xl transition-all">
              Start Face Recognition
            </button>
            <p class="text-sm text-gray-400 mt-4">
              Or <a (click)="goToPasswordLogin()" class="text-purple-400 underline cursor-pointer">sign in with password</a>
            </p>
          </div>
        </ng-container>

        <ng-container *ngIf="state === 'scanning' || state === 'processing'">
          <div class="text-center space-y-6 p-8 w-full max-w-md">
            <div class="face-status-visual" [class.processing]="state === 'processing'" aria-hidden="true">
              <svg viewBox="0 0 160 160" class="face-id-svg">
                <rect x="34" y="34" width="92" height="92" rx="28"></rect>
                <path d="M58 68V58a12 12 0 0 1 12-12h8"></path>
                <path d="M102 68V58a12 12 0 0 0-12-12h-8"></path>
                <path d="M58 92v10a12 12 0 0 0 12 12h8"></path>
                <path d="M102 92v10a12 12 0 0 1-12 12h-8"></path>
                <path d="M68 78v12M92 78v12"></path>
                <path d="M74 104c4 3 8 3 12 0"></path>
              </svg>
              <span class="scan-beam"></span>
            </div>

            <video #videoEl autoplay muted playsinline class="hidden-camera-feed"></video>

            <h2 class="text-2xl font-bold text-purple-300">
              {{ state === 'processing' ? 'Matching your Face ID...' : 'Scanning securely' }}
            </h2>

            <p class="text-purple-200 text-sm">
              The camera is active, but your face preview is hidden. EverCare is verifying in the background.
            </p>

            <p *ngIf="errorMessage" class="text-red-400 text-sm">{{ errorMessage }}</p>

            <div class="flex space-x-4 justify-center">
              <button (click)="retryScan()"
                *ngIf="state !== 'processing'"
                class="text-sm text-purple-400 underline cursor-pointer">
                Retry
              </button>
              <button (click)="goToPasswordLogin()"
                class="text-sm text-gray-400 underline cursor-pointer">
                Use password instead
              </button>
            </div>
          </div>
        </ng-container>

        <ng-container *ngIf="state === 'recovered'">
          <div class="text-center space-y-6">
            <div class="face-status-visual recovered" aria-hidden="true">
              <svg viewBox="0 0 160 160" class="face-id-svg">
                <rect x="34" y="34" width="92" height="92" rx="28"></rect>
                <path d="M66 78v9M94 78v9"></path>
                <path d="M64 101c8 11 24 11 32 0"></path>
                <path d="M50 47 39 58M110 47l11 11M50 113l-11-11M110 113l11-11"></path>
              </svg>
            </div>
            <h2 class="text-3xl font-bold text-green-400">Identity Verified!</h2>
            <p class="text-purple-200">Restoring your session...</p>
          </div>
        </ng-container>
      </div>
    </ng-container>
  `,
  styles: [`
    .face-status-visual {
      position: relative;
      width: 168px;
      height: 168px;
      margin: 0 auto;
      display: grid;
      place-items: center;
      border-radius: 42px;
      background: linear-gradient(145deg, rgba(124, 58, 237, 0.22), rgba(45, 212, 191, 0.12));
      box-shadow:
        0 0 0 1px rgba(196, 181, 253, 0.22) inset,
        0 18px 54px rgba(124, 58, 237, 0.28);
      overflow: hidden;
      animation: faceScanPulse 1.9s ease-in-out infinite;
    }

    .face-status-visual::before {
      content: '';
      position: absolute;
      inset: 12px;
      border-radius: 32px;
      border: 1px solid rgba(255, 255, 255, 0.13);
    }

    .face-status-visual.processing .face-id-svg {
      animation: faceVerifyTilt 1.1s ease-in-out infinite;
    }

    .face-status-visual.recovered {
      background: linear-gradient(145deg, rgba(16, 185, 129, 0.28), rgba(124, 58, 237, 0.16));
      box-shadow:
        0 0 0 1px rgba(167, 243, 208, 0.28) inset,
        0 18px 50px rgba(16, 185, 129, 0.3);
      animation: faceSuccessPop 0.7s cubic-bezier(0.2, 1.4, 0.3, 1) both;
    }

    .face-id-svg {
      width: 116px;
      height: 116px;
      fill: none;
      stroke: #e9d5ff;
      stroke-width: 5;
      stroke-linecap: round;
      stroke-linejoin: round;
      position: relative;
      z-index: 2;
    }

    .recovered .face-id-svg {
      stroke: #bbf7d0;
    }

    .scan-beam {
      position: absolute;
      left: 18px;
      right: 18px;
      height: 3px;
      border-radius: 999px;
      background: linear-gradient(90deg, transparent, #c4b5fd, #2dd4bf, transparent);
      box-shadow: 0 0 22px rgba(196, 181, 253, 0.85);
      animation: scanBeam 1.6s linear infinite;
      z-index: 3;
    }

    .hidden-camera-feed {
      position: fixed;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
      transform: scaleX(-1);
    }

    @keyframes scanBeam {
      0% { top: 20px; opacity: 0; }
      12% { opacity: 1; }
      88% { opacity: 1; }
      100% { top: 142px; opacity: 0; }
    }

    @keyframes faceScanPulse {
      0%, 100% {
        box-shadow: 0 0 0 1px rgba(196, 181, 253, 0.22) inset, 0 18px 54px rgba(124, 58, 237, 0.28);
      }
      50% {
        box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.34) inset, 0 18px 62px rgba(45, 212, 191, 0.28);
      }
    }

    @keyframes faceVerifyTilt {
      0%, 100% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(2deg) scale(1.04); }
    }

    @keyframes faceSuccessPop {
      0% { transform: scale(0.86); opacity: 0.4; }
      70% { transform: scale(1.06); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class InactivityAlertComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;

  state: AlertState = 'hidden';
  errorMessage = '';
  retryCount = 0;
  private maxRetries = 5;
  private keycloakId = '';
  private scanLoopActive = false;
  private alarmAudio: HTMLAudioElement | null = null;
  private subs = new Subscription();

  constructor(
    private inactivityService: InactivityService,
    private camera: CameraService,
    private faceService: FaceService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.inactivityService.inactivityAlert$.subscribe(() => {
        this.triggerAlert();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.stopAlarm();
    this.camera.stopCamera();
    this.scanLoopActive = false;
  }

  private triggerAlert(): void {
    const user = this.authService.getCurrentUserValue();
    if (!user?.keycloakId) {
      console.warn('No keycloakId on user - cannot trigger face alert');
      return;
    }
    this.keycloakId = user.keycloakId;
    this.retryCount = 0;
    this.errorMessage = '';
    this.state = 'alert';
    this.startAlarm();
    this.cdr.markForCheck();

    setTimeout(() => {
      if (this.state === 'alert') {
        this.startScan();
      }
    }, 2000);
  }

  async startScan(): Promise<void> {
    this.errorMessage = '';
    this.state = 'scanning';
    this.cdr.markForCheck();

    await this.waitForVideoElement();

    try {
      await this.camera.startCamera(this.videoRef.nativeElement);
      this.beginScanLoop();
    } catch {
      this.errorMessage = 'Camera access denied. Please use password login.';
      this.state = 'alert';
      this.cdr.markForCheck();
    }
  }

  private beginScanLoop(): void {
    this.scanLoopActive = true;
    this.scheduleScan();
  }

  private scheduleScan(): void {
    setTimeout(() => {
      if (!this.scanLoopActive) return;
      this.captureAndVerify();
    }, 2000);
  }

  private captureAndVerify(): void {
    if (!this.scanLoopActive) return;

    let frame: string;
    try {
      frame = this.camera.captureFrame(this.videoRef.nativeElement);
    } catch {
      this.errorMessage = 'Capture failed - retrying...';
      this.cdr.markForCheck();
      if (this.scanLoopActive) setTimeout(() => this.scheduleScan(), 2000);
      return;
    }

    this.state = 'processing';
    this.cdr.markForCheck();

    this.faceService.faceLogin(this.keycloakId, frame).subscribe({
      next: (res: any) => {
        this.scanLoopActive = false;
        this.camera.stopCamera();
        localStorage.setItem('auth_token', res.token);

        const user = this.authService.getCurrentUserValue();
        if (user) {
          this.authService.setCurrentUser(user);
        }

        this.authService.fetchCurrentUser().subscribe({
          next: () => this.recoverSession(),
          error: () => this.recoverSession(),
        });
      },
      error: () => {
        this.retryCount++;
        this.errorMessage = `Face not recognized (attempt ${this.retryCount}/${this.maxRetries})`;
        this.state = 'scanning';
        this.cdr.markForCheck();

        if (this.retryCount >= this.maxRetries) {
          this.scanLoopActive = false;
          this.camera.stopCamera();
          this.errorMessage = 'Too many failed attempts. Please use password.';
          this.state = 'alert';
          this.cdr.markForCheck();
        } else if (this.scanLoopActive) {
          setTimeout(() => this.scheduleScan(), 1500);
        }
      }
    });
  }

  retryScan(): void {
    this.errorMessage = '';
    this.retryCount = 0;
    this.state = 'scanning';
    this.cdr.markForCheck();
    this.scheduleScan();
  }

  goToPasswordLogin(): void {
    this.scanLoopActive = false;
    this.stopAlarm();
    this.camera.stopCamera();
    this.state = 'hidden';
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private recoverSession(): void {
    this.inactivityService.notifyRecovered();
    this.state = 'recovered';
    this.stopAlarm();
    this.cdr.markForCheck();

    setTimeout(() => {
      this.state = 'hidden';
      this.cdr.markForCheck();
    }, 2000);
  }

  private startAlarm(): void {
    if (this.alarmAudio) return;
    this.alarmAudio = this.createBeepAlarm();
  }

  private stopAlarm(): void {
    if (this.alarmAudio) {
      this.alarmAudio.pause();
      this.alarmAudio = null;
    }
    this.stopBeepAlarm();
  }

  private audioCtx: AudioContext | null = null;
  private beepIntervalId: any = null;

  private createBeepAlarm(): HTMLAudioElement {
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.beepIntervalId = setInterval(() => this.playBeep(), 800);
    return new Audio();
  }

  private playBeep(): void {
    if (!this.audioCtx) return;
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.4);
    oscillator.start(this.audioCtx.currentTime);
    oscillator.stop(this.audioCtx.currentTime + 0.4);
  }

  private stopBeepAlarm(): void {
    if (this.beepIntervalId) {
      clearInterval(this.beepIntervalId);
      this.beepIntervalId = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
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
