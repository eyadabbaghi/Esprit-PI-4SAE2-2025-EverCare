import { Injectable, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class InactivityService {

  private checkInterval: any = null;
  private readonly CHECK_EVERY_MS = 5_000;
  private readonly LOGGED_OUT_THRESHOLD_MS = 10_000;

  constructor(
    private zone: NgZone,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private getItem(key: string): string | null {
    try {
      if (!isPlatformBrowser(this.platformId)) return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  startLogoutWatcher(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stopLogoutWatcher();
    this.checkInterval = setInterval(() => this.checkIfShouldRecover(), this.CHECK_EVERY_MS);
  }

  stopLogoutWatcher(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkIfShouldRecover(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const isRecoveryActive = localStorage.getItem('face_recovery_active') === 'true';
      if (!isRecoveryActive) return;

      if (this.router.url.includes('face-recovery') || this.router.url.includes('face-login')) return;

      const since = parseInt(localStorage.getItem('face_recovery_since') || '0', 10);
      const elapsedMs = Date.now() - since;

      if (elapsedMs >= this.LOGGED_OUT_THRESHOLD_MS) {
        this.zone.run(() => {
          this.router.navigate(['/face-recovery']);
        });
      }
    } catch (e) {
      // localStorage not available on server — silently ignore
    }
  }
}