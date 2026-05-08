import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Download, Loader, LucideAngularModule, Mail } from 'lucide-angular';

import { PrescriptionRoutingModule } from './prescription-routing.module';

import { PrescriptionPageComponent } from './pages/prescription-page/prescription-page.component';
import { PrescriptionListComponent } from './components/prescription-list/prescription-list.component';
import { PrescriptionCardComponent } from './components/prescription-card/prescription-card.component';
import { PrescriptionFormComponent } from './components/prescription-form/prescription-form.component';
import { PrescriptionDetailsComponent } from './components/prescription-details/prescription-details.component';
import { MedicationSelectorComponent } from './components/medication-selector/medication-selector.component';
import { UserPrescriptionsComponent } from './pages/user-prescriptions/user-prescriptions.component';
import { PatientPrescriptionPageComponent } from './pages/patient-prescription-page/patient-prescription-page.component';
import { DoctorPrescriptionPageComponent } from './pages/doctor-prescription-page/doctor-prescription-page.component';
import { DoctorPrescriptionManageComponent } from './pages/doctor-prescription-manage/doctor-prescription-manage.component';
import { DoctorPrescriptionAnalyticsComponent } from './pages/doctor-prescription-analytics/doctor-prescription-analytics.component';
import { DoctorPrescriptionCreateComponent } from './pages/doctor-prescription-create/doctor-prescription-create.component';
import { CaregiverPatientPrescriptionsComponent } from './pages/caregiver-patient-prescriptions/caregiver-patient-prescriptions.component';

// Import PrescriptionActionsComponent from appointments module
import { PrescriptionActionsComponent } from '../appointments/components/prescription-actions/prescription-actions.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    PrescriptionPageComponent,
    PrescriptionListComponent,
    PrescriptionCardComponent,
    PrescriptionFormComponent,
    PrescriptionDetailsComponent,
    MedicationSelectorComponent,
    UserPrescriptionsComponent,
    PatientPrescriptionPageComponent,
    DoctorPrescriptionPageComponent,
    DoctorPrescriptionManageComponent,
    DoctorPrescriptionAnalyticsComponent,
    DoctorPrescriptionCreateComponent,
    CaregiverPatientPrescriptionsComponent,
    PrescriptionActionsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    LucideAngularModule.pick({ Download, Loader, Mail }),
    SharedModule,
    PrescriptionRoutingModule
  ]
})
export class PrescriptionModule {}
