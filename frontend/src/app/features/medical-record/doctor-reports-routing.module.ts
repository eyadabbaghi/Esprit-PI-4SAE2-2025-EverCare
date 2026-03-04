import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DoctorReportsListComponent } from './pages/doctor-reports-list/doctor-reports-list.component';

const routes: Routes = [
  { path: 'reports', component: DoctorReportsListComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DoctorReportsRoutingModule { }
