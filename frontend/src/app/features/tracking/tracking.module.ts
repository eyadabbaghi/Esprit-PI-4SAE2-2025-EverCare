import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackingRoutingModule } from './tracking-routing.module';
import { SavedPlacesComponent } from './pages/saved-places/saved-places.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DoctorDashboardComponent } from './pages/doctor-dashboard/doctor-dashboard.component';
import { TrackingAssistantComponent } from './components/tracking-assistant/tracking-assistant.component';
import { CaregiverDashboardComponent } from './pages/caregiver-dashboard/caregiver-dashboard.component';

@NgModule({
  declarations: [
    SavedPlacesComponent,
    DoctorDashboardComponent,
    TrackingAssistantComponent,
    CaregiverDashboardComponent
  ],
  imports: [
    CommonModule,
    TrackingRoutingModule,
    ReactiveFormsModule,
    FormsModule
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class TrackingModule { }
