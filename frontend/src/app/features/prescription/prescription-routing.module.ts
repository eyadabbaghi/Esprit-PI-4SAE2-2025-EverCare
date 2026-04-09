import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserPrescriptionsComponent } from './pages/user-prescriptions/user-prescriptions.component';
import { PatientPrescriptionPageComponent } from './pages/patient-prescription-page/patient-prescription-page.component';
import { DoctorPrescriptionPageComponent } from './pages/doctor-prescription-page/doctor-prescription-page.component';
import {PrescriptionFormComponent} from './components/prescription-form/prescription-form.component';
import { DoctorPrescriptionManageComponent } from './pages/doctor-prescription-manage/doctor-prescription-manage.component';
import { DoctorPrescriptionAnalyticsComponent } from './pages/doctor-prescription-analytics/doctor-prescription-analytics.component';
import { DoctorPrescriptionCreateComponent } from './pages/doctor-prescription-create/doctor-prescription-create.component';
import { CaregiverPatientPrescriptionsComponent } from './pages/caregiver-patient-prescriptions/caregiver-patient-prescriptions.component';

const routes: Routes = [
  { path: '', component: UserPrescriptionsComponent },
  { path: 'patient', component: PatientPrescriptionPageComponent },
  { path: 'patient/active', component: PatientPrescriptionPageComponent },
  { path: 'patient/today', component: PatientPrescriptionPageComponent },
  { path: 'patient/history', component: PatientPrescriptionPageComponent },
  { path: 'patient/prescription/:id', component: PatientPrescriptionPageComponent },
  { path: 'doctor', component: DoctorPrescriptionManageComponent },
  { path: 'doctor/overview', component: DoctorPrescriptionPageComponent },
  { path: 'doctor/manage', component: DoctorPrescriptionManageComponent },
  { path: 'doctor/analytics', component: DoctorPrescriptionAnalyticsComponent },
  { path: 'doctor/prescribe', component: DoctorPrescriptionCreateComponent },
  { path: 'doctor/prescribe/:patientId', component: DoctorPrescriptionCreateComponent },
  { path: 'doctor/prescribe/:patientId/:appointmentId', component: DoctorPrescriptionCreateComponent },
  { path: 'caregiver', component: CaregiverPatientPrescriptionsComponent },
  { path: 'caregiver/patient/:patientId', component: CaregiverPatientPrescriptionsComponent },
  { path: 'caregiver/patient/:patientId/active', component: CaregiverPatientPrescriptionsComponent },
  { path: 'caregiver/patient/:patientId/today', component: CaregiverPatientPrescriptionsComponent },
  { path: 'caregiver/patient/:patientId/history', component: CaregiverPatientPrescriptionsComponent },
  { path: 'caregiver/patient/:patientId/prescription/:prescriptionId', component: CaregiverPatientPrescriptionsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrescriptionRoutingModule {}
