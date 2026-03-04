import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {HomeComponent} from '../front-office/pages/home/home.component';
import {DoctorAppointmentsPageComponent} from './pages/doctor-appointments-page/doctor-appointments-page.component';
import {AppointmentsPageComponent} from './pages/appointments-page/appointments-page.component';
import {
  CaregiverAppointmentsPageComponent
} from './pages/caregiver-appointments-page/caregiver-appointments-page.component';

const routes: Routes = [
  { path: '', component: AppointmentsPageComponent },
  { path: 'doctor', component:DoctorAppointmentsPageComponent},
  {path: 'caregiver', component: CaregiverAppointmentsPageComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]

})
export class AppointmentsRoutingModule {}
