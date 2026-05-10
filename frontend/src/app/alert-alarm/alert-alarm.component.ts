import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, ChangeDetectorRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertSchedulerService, ScheduledAlertFire } from '../core/services/alert-scheduler.service';

@Component({
  selector: 'app-alert-alarm',
  templateUrl: './alert-alarm.component.html',
  styleUrls: ['./alert-alarm.component.css']
})
export class AlertAlarmComponent implements OnInit, OnDestroy {
  @Output() dismissed = new EventEmitter<string>(); // emits alertId
  @Output() emergencySent = new EventEmitter<string>(); // emits alertId

  visible = false;
  currentFire: ScheduledAlertFire | null = null;
  countdown = 60;

  private countdownInterval: any;
  private audioCtx: AudioContext | null = null;
  private alarmNodes: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  private queue: ScheduledAlertFire[] = [];
  private schedulerSub?: Subscription;

  constructor(
    private schedulerService: AlertSchedulerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.schedulerSub = this.schedulerService.alertFired$.subscribe(fire => {
      if (this.currentFire?.alertId === fire.alertId || this.queue.some(item => item.alertId === fire.alertId)) {
        return;
      }
      this.queue.push(fire);
      if (!this.visible) {
        this.showNext();
      }
    });
  }

  private showNext(): void {
    if (this.queue.length === 0) return;
    this.currentFire = this.queue.shift()!;
    this.countdown = 60;
    this.visible = true;
    this.startAlarmSound();
    this.startCountdown();
    this.cdr.detectChanges();
  }

  private startAlarmSound(): void {
    this.stopAlarmSound();
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.playBeepCycle();
    } catch (e) {
      console.warn('Web Audio not supported', e);
    }
  }

  private playBeepCycle(): void {
    if (!this.audioCtx || !this.visible) return;
    const ctx = this.audioCtx;

    // Two-tone alarm: high then low beep
    const freqs = [880, 660];
    let time = ctx.currentTime;

    for (let i = 0; i < 60; i++) { // enough cycles for 60s
      freqs.forEach((freq, fi) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time + fi * 0.25);
        gain.gain.linearRampToValueAtTime(0.3, time + fi * 0.25 + 0.02);
        gain.gain.setValueAtTime(0.3, time + fi * 0.25 + 0.22);
        gain.gain.linearRampToValueAtTime(0, time + fi * 0.25 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time + fi * 0.25);
        osc.stop(time + fi * 0.25 + 0.25);
        this.alarmNodes.push({ oscillator: osc, gain });
      });
      time += 1.2; // 1.2s per full beep cycle
    }
  }

  private stopAlarmSound(): void {
    for (const node of this.alarmNodes) {
      try {
        node.gain.gain.cancelScheduledValues(0);
        node.gain.gain.setValueAtTime(0, this.audioCtx?.currentTime ?? 0);
      } catch (e) {}
      try { node.oscillator.stop(); } catch (e) {}
      try { node.oscillator.disconnect(); } catch (e) {}
      try { node.gain.disconnect(); } catch (e) {}
    }
    this.alarmNodes = [];

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges();

      if (this.countdown <= 0) {
        this.triggerEmergency();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private triggerEmergency(): void {
    this.stopAlarmSound();
    this.stopCountdown();

    if (this.currentFire) {
      const fire = this.currentFire;
      if (fire.caregiverPhone) {
        this.schedulerService.sendEmergencySms({
          alertId: fire.alertId,
          caregiverPhone: fire.caregiverPhone,
          patientName: fire.patientName || 'Patient',
          alertLabel: fire.label,
          incidentTitle: fire.incidentTitle,
        }).subscribe({
          next: () => console.log('Emergency SMS sent'),
          error: err => console.error('SMS failed', err)
        });
      }
      this.emergencySent.emit(fire.alertId);
    }

    this.visible = false;
    this.currentFire = null;
    setTimeout(() => this.showNext(), 500);
  }

  complete(): void {
    const completedAlertId = this.currentFire?.alertId;
    this.stopAlarmSound();
    this.stopCountdown();

    if (completedAlertId) {
      this.queue = this.queue.filter(item => item.alertId !== completedAlertId);
      this.dismissed.emit(completedAlertId);
    }

    this.visible = false;
    this.currentFire = null;
    setTimeout(() => this.showNext(), 500);
  }

  ngOnDestroy(): void {
    this.schedulerSub?.unsubscribe();
    this.stopAlarmSound();
    this.stopCountdown();
  }
}
