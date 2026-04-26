import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-welcome-popup',
  templateUrl: './welcome-popup.component.html',
  styleUrls: ['./welcome-popup.component.css'],
})
export class WelcomePopupComponent {
  @Output() completed = new EventEmitter<void>();
@Output() skipped = new EventEmitter<void>();

finishTour(): void {
  this.completed.emit();
}

skipTour(): void {
  this.skipped.emit();
}
}

