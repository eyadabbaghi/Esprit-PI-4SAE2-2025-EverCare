import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { EmergencySosPopupService } from '../../../../core/services/emergency-sos-popup.service';

@Component({
  selector: 'app-emergency-sos-popup',
  templateUrl: './emergency-sos-popup.component.html',
  styleUrls: ['./emergency-sos-popup.component.css']
})
export class EmergencySosPopupComponent implements OnInit, OnDestroy {
  visible = false;
  countdown = 10;

  private popupSub?: Subscription;
  private countdownTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly sosPopup: EmergencySosPopupService,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.popupSub = this.sosPopup.show$.subscribe(() => this.show());
  }

  ngOnDestroy(): void {
    this.popupSub?.unsubscribe();
    this.clearCountdown();
  }

  show(): void {
    this.clearCountdown();
    this.visible = true;
    this.countdown = 10;

    this.ngZone.runOutsideAngular(() => {
      this.countdownTimer = setInterval(() => {
        this.ngZone.run(() => {
          this.countdown--;
          if (this.countdown <= 0) {
            this.close();
          }
        });
      }, 1000);
    });
  }

  close(): void {
    this.clearCountdown();
    this.visible = false;
  }

  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }
}
