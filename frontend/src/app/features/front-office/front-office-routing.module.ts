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
import { FrontOfficeAuthGuard } from '../../core/guards/front-office-auth.guard';

const routes: Routes = [
  { path: 'setup-profile', component: SetupProfileComponent, canActivate: [FrontOfficeAuthGuard] },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    component: FrontOfficeLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'activities', component: ActivitiesComponent, canActivate: [FrontOfficeAuthGuard] },
      { path: 'activities/:id', component: ActivityDetailsComponent, canActivate: [FrontOfficeAuthGuard] },
      { path: 'alerts', component: AlertsComponent, canActivate: [FrontOfficeAuthGuard] },
      { path: 'profile', component: ProfileComponent, canActivate: [FrontOfficeAuthGuard] },
      {
        path: 'appointments',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../appointments/appointments.module').then(m => m.AppointmentsModule)
      },
      {
        path: 'prescriptions',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../prescription/prescription.module').then(m => m.PrescriptionModule)
      },
      { path: 'medical-folder', redirectTo: 'medical-record', pathMatch: 'full' },
      {
        path: 'medical-record',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../medical-record/medical-record.module').then(m => m.MedicalRecordModule)
      },
      {
        path: 'assessment',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../medical-record/assessment.module').then(m => m.AssessmentModule)
      },
      {
        path: 'doctor',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../medical-record/doctor-reports.module').then(m => m.DoctorReportsModule)
      },
      {
        path: 'cognitive-stimulation',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../cognitive-stimulation/cognitive-stimulation.module').then(m => m.CognitiveStimulationModule)
      },
      {
        path: 'blog',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../blog/blog.module').then(m => m.BlogModule)
      },
      {
        path: 'communication',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../communication/communication.module').then(m => m.CommunicationModule)
      },
      // ✅ NEW: Daily Me module
      {
        path: 'daily-me',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../daily-me/daily-me.module').then(m => m.DailyMeModule)
      },
      
      // ✅ NEW: Tracking module (supports sub-routes like /tracking/doctor, /tracking/caregiver, /tracking/saved-places)
      {
        path: 'tracking',
        canActivate: [FrontOfficeAuthGuard],
        loadChildren: () => import('../tracking/tracking.module').then(m => m.TrackingModule)
      },
      { path: 'setup-face-id', component: FaceSetupComponent, canActivate: [FrontOfficeAuthGuard] },
      { path: 'face-login', component: FaceLoginComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FrontOfficeRoutingModule {}
