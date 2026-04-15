import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssessmentFormComponent } from './pages/assessment-form/assessment-form.component';
import { AssessmentReportComponent } from './pages/assessment-report/assessment-report.component';

const routes: Routes = [
  { path: '', component: AssessmentFormComponent },
  { path: 'report/:id', component: AssessmentReportComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AssessmentRoutingModule { }
