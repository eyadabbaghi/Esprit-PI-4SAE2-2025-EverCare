import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ActivitiesComponent } from './pages/activities/activities.component';
import { ActivityDetailsComponent } from './pages/activity-details/activity-details.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { FrontOfficeLayoutComponent } from '../../layouts/front-office-layout/front-office-layout.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SetupProfileComponent } from './pages/setup-profile/setup-profile.component';
const routes: Routes = [
  { path: 'setup-profile', component: SetupProfileComponent },

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

      {
        path: 'appointments',
        loadChildren: () => import('../appointments/appointments.module').then(m => m.AppointmentsModule)
      },

      {
        path: 'medical-folder',
        loadChildren: () => import('../medical-folder/medical-folder.module').then(m => m.MedicalFolderModule)
      },

      //{
        //path:"daily-me",
        //loadChildren: () => import('../daily-me/daily-me.module').then(m => m.DailyMeModule)

      //},
      //{

      // path: 'communication',
    // loadChildren: () => import('../communication/communication.module').then(m => m.CommunicationModule)
      //}
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FrontOfficeRoutingModule {}
