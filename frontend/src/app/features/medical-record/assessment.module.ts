import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AssessmentRoutingModule } from './assessment-routing.module';
import { AssessmentFormComponent } from './pages/assessment-form/assessment-form.component';
import { AssessmentReportComponent } from './pages/assessment-report/assessment-report.component';

@NgModule({
  declarations: [
    AssessmentFormComponent,
    AssessmentReportComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AssessmentRoutingModule,
  ]
})
export class AssessmentModule { }
