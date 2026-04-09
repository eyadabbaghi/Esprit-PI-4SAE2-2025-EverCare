import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ActivitiesComponent } from './pages/activities/activities.component';
import { ActivityDetailsComponent } from './pages/activity-details/activity-details.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { FrontOfficeLayoutComponent } from '../../layouts/front-office-layout/front-office-layout.component';
import { ProfileComponent } from './pages/profile/profile.component';
import {AppointmentsPageComponent} from '../appointments/pages/appointments-page/appointments-page.component';

const routes: Routes = [
  {
    path: '',
    component: FrontOfficeLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'login', component: LoginComponent },
      { path: 'activities', component: ActivitiesComponent },
      { path: 'activities/:id', component: ActivityDetailsComponent },
      { path: 'alerts', component: AlertsComponent },
      { path: 'profile', component: ProfileComponent },
      {path: 'appointments', component:AppointmentsPageComponent },
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
      }

    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FrontOfficeRoutingModule {}
