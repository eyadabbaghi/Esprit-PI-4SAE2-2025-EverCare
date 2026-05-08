import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-new-user-flow',
  templateUrl: './new-user-flow.component.html',
})
export class NewUserFlowComponent {
  @Output() finished = new EventEmitter<void>();

  constructor(private readonly router: Router) {}

  continueToMedicalRecordAssessment(): void {
    localStorage.removeItem('showWelcomeFlow');
    this.finished.emit();
    this.router.navigate(['/assessment'], { queryParams: { source: 'onboarding' } });
  }

  onWelcomeCompleted(): void {
    this.continueToMedicalRecordAssessment();
  }

  onFlowSkipped(): void {
    this.continueToMedicalRecordAssessment();
  }
}
