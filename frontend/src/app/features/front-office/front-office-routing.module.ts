import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ActivitiesComponent } from './pages/activities/activities.component';
import { ActivityDetailsComponent } from './pages/activity-details/activity-details.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { FrontOfficeLayoutComponent } from '../../layouts/front-office-layout/front-office-layout.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SetupProfileComponent } from './pages/setup-profile/setup-profile.component';
import { FaceLoginComponent } from './pages/face-login/face-login.component';
import { FaceSetupComponent } from './pages/face-setup/face-setup.component';
import { AppointmentsPageComponent } from '../appointments/pages/appointments-page/appointments-page.component';

const routes: Routes = [
  { path: 'setup-profile', component: SetupProfileComponent },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    component: FrontOfficeLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'activities', component: ActivitiesComponent },
      { path: 'activities/:id', component: ActivityDetailsComponent },
      { path: 'alerts', component: AlertsComponent },
      { path: 'profile', component: ProfileComponent },
      {
        path: 'appointments',
        loadChildren: () => import('../appointments/appointments.module').then(m => m.AppointmentsModule)
      },
      {
        path: 'prescriptions',
        loadChildren: () => import('../prescription/prescription.module').then(m => m.PrescriptionModule)
      },
      { path: 'medical-folder', redirectTo: 'medical-record', pathMatch: 'full' },
      {
        path: 'medical-record',
        loadChildren: () => import('../medical-record/medical-record.module').then(m => m.MedicalRecordModule)
      },
      {
        path: 'assessment',
        loadChildren: () => import('../medical-record/assessment.module').then(m => m.AssessmentModule)
      },
      {
        path: 'doctor',
        loadChildren: () => import('../medical-record/doctor-reports.module').then(m => m.DoctorReportsModule)
      },
      {
        path: 'cognitive-stimulation',
        loadChildren: () => import('../cognitive-stimulation/cognitive-stimulation.module').then(m => m.CognitiveStimulationModule)
      },
      {
        path: 'blog',
        loadChildren: () => import('../blog/blog.module').then(m => m.BlogModule)
      },
      // ✅ NOUVEAU : route pour la messagerie
      {
        path: 'communication',
        loadChildren: () => import('../communication/communication.module').then(m => m.CommunicationModule)
      },
      { path: 'setup-face-id', component: FaceSetupComponent },
      { path: 'face-login', component: FaceLoginComponent },
    ],
  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FrontOfficeRoutingModule {
} 
