import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-new-user-flow',
  templateUrl: './new-user-flow.component.html',
})
export class NewUserFlowComponent {
  @Output() finished = new EventEmitter<void>();

  finishOnboarding(): void {
    localStorage.removeItem('showWelcomeFlow');
    this.finished.emit();
  }

  onWelcomeCompleted(): void {
    this.finishOnboarding();
  }

  onFlowSkipped(): void {
    this.finishOnboarding();
  }
}
