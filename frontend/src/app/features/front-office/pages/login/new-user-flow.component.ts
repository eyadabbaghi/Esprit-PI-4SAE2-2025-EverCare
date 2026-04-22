import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-new-user-flow',
  templateUrl: './new-user-flow.component.html',
})
export class NewUserFlowComponent {
  @Output() finished = new EventEmitter<void>();

  step: 'welcome' | 'assessment' = 'welcome';

  onWelcomeCompleted(): void {
    this.step = 'assessment';
  }

  onFlowSkipped(): void {
    // User skipped the assessment or closed the welcome
    localStorage.removeItem('showWelcomeFlow');
    this.finished.emit();
  }

  onAssessmentCompleted(): void {
    // Assessment finished (user saw summary and clicked finish)
    localStorage.removeItem('showWelcomeFlow');
    this.finished.emit();
  }
}