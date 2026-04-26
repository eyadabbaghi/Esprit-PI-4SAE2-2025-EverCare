import {
  Component, OnInit, OnDestroy, ViewChild,
  ElementRef, ChangeDetectorRef, ChangeDetectionStrategy
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
    <!-- Hidden state: render nothing -->
    <ng-container *ngIf="state !== 'hidden'">

      <!-- Full-screen overlay -->
      <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
           style="background: rgba(10,0,30,0.97);">

        <!-- ALERT STATE -->
        <ng-container *ngIf="state === 'alert'">
          <div class="text-center space-y-6 p-8">
            <div class="text-6xl animate-bounce">🚨</div>
            <h1 class="text-4xl font-bold text-red-400">Inactivity Detected</h1>
            <p class="text-lg text-purple-200">
              You've been inactive for over 3 minutes.<br/>
              Please verify your identity to continue.
            </p>
            <button (click)="startScan()"
              class="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-10 rounded-2xl text-xl transition-all">
              📷 Scan My Face
            </button>
            <p class="text-sm text-gray-400 mt-4">
              Or <a (click)="goToPasswordLogin()" class="text-purple-400 underline cursor-pointer">sign in with password</a>
            </p>
          </div>
        </ng-container>

        <!-- SCANNING STATE -->
        <ng-container *ngIf="state === 'scanning' || state === 'processing'">
          <div class="text-center space-y-6 p-8 w-full max-w-md">
            <h2 class="text-2xl font-bold text-purple-300">
              {{ state === 'processing' ? 'Verifying...' : 'Look at the camera' }}
            </h2>

            <!-- Camera feed -->
            <div class="relative mx-auto w-72 h-72 rounded-full overflow-hidden border-4
                        border-purple-500 shadow-[0_0_40px_rgba(124,58,237,0.8)]">
              <video #videoEl autoplay muted playsinline
                     class="w-full h-full object-cover scale-x-[-1]"
                     style="transform: scaleX(-1);">
              </video>
              <!-- Scanning overlay -->
              <div *ngIf="state === 'processing'"
                   class="absolute inset-0 bg-purple-900/60 flex items-center justify-center">
                <div class="text-4xl animate-spin">⚙️</div>
              </div>
              <!-- Scan line animation -->
              <div *ngIf="state === 'scanning'"
                   class="absolute inset-0 pointer-events-none overflow-hidden">
                <div class="absolute w-full h-1 bg-purple-400/70 animate-scan-line"></div>
              </div>
            </div>

            <p class="text-purple-200 text-sm">
              {{ state === 'processing' ? 'Checking your identity...' : 'Auto-scanning in progress...' }}
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

        <!-- RECOVERED STATE -->
        <ng-container *ngIf="state === 'recovered'">
          <div class="text-center space-y-6">
            <div class="text-6xl">✅</div>
            <h2 class="text-3xl font-bold text-green-400">Identity Verified!</h2>
            <p class="text-purple-200">Restoring your session...</p>
          </div>
        </ng-container>

      </div>

    </ng-container>
  `,
  styles: [`
    @keyframes scan-line {
      0%   { top: 0%; }
      100% { top: 100%; }
    }
    .animate-scan-line {
      animation: scan-line 2s linear infinite;
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
    // Listen for inactivity trigger
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
      console.warn('No keycloakId on user — cannot trigger face alert');
      return;
    }
    this.keycloakId = user['keycloakId'] as string;
    this.retryCount = 0;
    this.errorMessage = '';
    this.state = 'alert';
    this.startAlarm();
    this.cdr.markForCheck();

    // Auto-start scanning after 2 seconds (don't wait for button)
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

    // Wait for DOM to render the video element
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
    // Capture after 2 seconds to let face settle
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
      this.errorMessage = 'Capture failed — retrying...';
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

        // Restore session
        localStorage.setItem('auth_token', res.token);

        const user = this.authService.getCurrentUserValue();
        if (user) {
          this.authService.setCurrentUser(user);
        }

        // Fetch fresh user data
        this.authService.fetchCurrentUser().subscribe({
          next: () => {
            this.inactivityService.notifyRecovered();
            this.state = 'recovered';
            this.stopAlarm();
            this.cdr.markForCheck();

            setTimeout(() => {
              this.state = 'hidden';
              this.cdr.markForCheck();
            }, 2000);
          },
          error: () => {
            // Even if fetch fails, we have a token — recover anyway
            this.inactivityService.notifyRecovered();
            this.state = 'recovered';
            this.stopAlarm();
            this.cdr.markForCheck();
            setTimeout(() => { this.state = 'hidden'; this.cdr.markForCheck(); }, 2000);
          }
        });
      },
      error: (err) => {
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
          // Auto-retry
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

  // ── Alarm ────────────────────────────────────────────────────
  private startAlarm(): void {
    if (this.alarmAudio) return;
    // Uses the Web Audio API to generate a beeping alarm — no file needed
    this.alarmAudio = this.createBeepAlarm();
  }

  private stopAlarm(): void {
    if (this.alarmAudio) {
      this.alarmAudio.pause();
      this.alarmAudio = null;
    }
    this.stopBeepAlarm();
  }

  // Web Audio API beep loop (no audio file needed)
  private audioCtx: AudioContext | null = null;
  private beepIntervalId: any = null;

  private createBeepAlarm(): HTMLAudioElement {
    // We use Web Audio API instead — return a dummy element
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.beepIntervalId = setInterval(() => this.playBeep(), 800);
    return new Audio(); // placeholder
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

  // ── Helpers ───────────────────────────────────────────────────
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