import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-welcome-popup',
  templateUrl: './welcome-popup.component.html',
  styleUrls: ['./welcome-popup.component.css'],
})
export class WelcomePopupComponent implements AfterViewInit {
  @Input() eyebrow = 'Welcome to EverCare';
  @Input() title = "Let's take a quick tour";
  @Input() subtitle = 'Your care workspace is ready. Here are the essentials before you begin.';
  @Input() primaryLabel = 'Start using EverCare';
  @Input() secondaryLabel = 'Remind me later';
  @Input() skipLabel = 'Skip for now';
  @Input() clearWelcomeFlagOnAction = true;

  @Output() completed = new EventEmitter<void>();
  @Output() skipped = new EventEmitter<void>();

  ngAfterViewInit(): void {
    this.playWelcomeSound();
  }

  finishTour(): void {
    if (this.clearWelcomeFlagOnAction) {
      localStorage.removeItem('showWelcomeFlow');
    }
    this.completed.emit();
  }

  skipTour(): void {
    if (this.clearWelcomeFlagOnAction) {
      localStorage.removeItem('showWelcomeFlow');
    }
    this.skipped.emit();
  }

  private playWelcomeSound(): void {
    try {
      const AudioContextRef = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextRef();
      const gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.72);

      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + index * 0.11);
        oscillator.connect(gain);
        oscillator.start(audioContext.currentTime + index * 0.11);
        oscillator.stop(audioContext.currentTime + index * 0.11 + 0.18);
      });

      setTimeout(() => audioContext.close(), 900);
    } catch {
      // Browsers can block audio before user interaction; the popup remains usable.
    }
  }
}
