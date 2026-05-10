// src/app/pages/assessment-page/assessment-page.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AssessmentResult } from '../../ui/alzheimers-assessment/alzheimers-assessment.component';
@Component({
  selector: 'app-assessment-page',
  template: `
    <app-alzheimers-assessment
      [allowCaregiverDelegation]="true"
      (completed)="onCompleted($event)"
      (skipped)="onSkipped()"
      (caregiverRequested)="onCaregiverRequested()">
    </app-alzheimers-assessment>
  `
})
export class AssessmentPageComponent {
  constructor(private router: Router) {}

  onCompleted(result: AssessmentResult): void {
    // Already saved to localStorage by the child component
    this.router.navigate(['/profile'], { fragment: 'assessment' });
  }

  onSkipped(): void {
    this.router.navigate(['/assessment'], { queryParams: { source: 'onboarding' } });
  }

  onCaregiverRequested(): void {
    if (localStorage.getItem('alzAssessmentReturnTo') === 'profile') {
      localStorage.removeItem('alzAssessmentReturnTo');
      this.router.navigate(['/profile']);
      return;
    }
    this.router.navigate(['/assessment'], { queryParams: { source: 'onboarding' } });
  }
}
