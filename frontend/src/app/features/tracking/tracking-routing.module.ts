import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SavedPlacesComponent } from './pages/saved-places/saved-places.component';
import { DoctorDashboardComponent } from './pages/doctor-dashboard/doctor-dashboard.component';
import { CaregiverDashboardComponent } from './pages/caregiver-dashboard/caregiver-dashboard.component';

const routes: Routes = [

  // 👨‍⚕️ DOCTOR
  { path: 'doctor', component: DoctorDashboardComponent },

  // 👥 CAREGIVER
  { path: 'caregiver', component: CaregiverDashboardComponent },

  // 👤 PATIENT
  { path: 'saved-places', component: SavedPlacesComponent },

  // DEFAULT
  { path: '', redirectTo: 'saved-places', pathMatch: 'full' }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrackingRoutingModule {}
