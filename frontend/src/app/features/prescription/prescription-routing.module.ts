import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserPrescriptionsComponent } from './pages/user-prescriptions/user-prescriptions.component';
import { PatientPrescriptionPageComponent } from './pages/patient-prescription-page/patient-prescription-page.component';
import { DoctorPrescriptionPageComponent } from './pages/doctor-prescription-page/doctor-prescription-page.component';
import { CaregiverPrescriptionPageComponent } from './pages/caregiver-prescription-page/caregiver-prescription-page.component';

const routes: Routes = [
  { path: '', component: UserPrescriptionsComponent },
  { path: 'patient', component: PatientPrescriptionPageComponent },
  { path: 'doctor', component: DoctorPrescriptionPageComponent },
  { path: 'caregiver', component: CaregiverPrescriptionPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrescriptionRoutingModule {}
