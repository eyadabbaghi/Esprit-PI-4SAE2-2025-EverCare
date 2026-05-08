import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DoctorAppointmentsPageComponent } from './pages/doctor-appointments-page/doctor-appointments-page.component';
import { AppointmentsPageComponent } from './pages/appointments-page/appointments-page.component';
import { CaregiverAppointmentsPageComponent } from './pages/caregiver-appointments-page/caregiver-appointments-page.component';
import { VideoConsultationPageComponent } from './pages/video-consultation-page/video-consultation-page.component';
import {UserAppointmentsComponent} from './pages/user-appointments/user-appointments.component';

const routes: Routes = [
  { path: '', component: UserAppointmentsComponent }, // Redirect to role-based page
  { path: 'patient', component: AppointmentsPageComponent },
  { path: 'doctor', component: DoctorAppointmentsPageComponent },
  { path: 'caregiver', component: CaregiverAppointmentsPageComponent },
  { path: 'video/:appointmentId', component: VideoConsultationPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppointmentsRoutingModule {}
