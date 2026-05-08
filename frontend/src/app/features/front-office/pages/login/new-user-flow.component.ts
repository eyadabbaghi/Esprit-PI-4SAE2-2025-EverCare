import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-new-user-flow',
  templateUrl: './new-user-flow.component.html',
})
export class NewUserFlowComponent {
  @Output() finished = new EventEmitter<void>();

  onWelcomeCompleted(): void {
    localStorage.removeItem('showWelcomeFlow');
    this.finished.emit(); // HomeComponent handles navigation
  }

  onFlowSkipped(): void {
    localStorage.removeItem('showWelcomeFlow');
    this.finished.emit(); // HomeComponent handles navigation
  }
}