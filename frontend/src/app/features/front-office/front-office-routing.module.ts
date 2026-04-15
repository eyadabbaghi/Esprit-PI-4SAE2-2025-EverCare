import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FrontOfficeLayoutComponent } from '../../layouts/front-office-layout/front-office-layout.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ActivitiesComponent } from './pages/activities/activities.component';
import { ActivityDetailsComponent } from './pages/activity-details/activity-details.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SetupProfileComponent } from './pages/setup-profile/setup-profile.component';
import { FaceSetupComponent } from './pages/face-setup/face-setup.component';

import { DailyMeListComponent } from '../daily-me/daily-me-list/daily-me-list.component';

const routes: Routes = [
  {
    path: '',
    component: FrontOfficeLayoutComponent,
    children: [
      { path: '', component: HomeComponent, pathMatch: 'full' },

      { path: 'login', component: LoginComponent },
      { path: 'setup-profile', component: SetupProfileComponent },
      { path: 'setup-face-id', component: FaceSetupComponent },
      { path: 'activities', component: ActivitiesComponent },
      { path: 'activities/:id', component: ActivityDetailsComponent },
      { path: 'alerts', component: AlertsComponent },
      { path: 'profile', component: ProfileComponent },

      { path: 'daily-me', component: DailyMeListComponent },

      // ✅ ADD THIS (Tracking)
      {
        path: 'tracking',
        loadChildren: () =>
          import('../tracking/tracking.module').then((m) => m.TrackingModule),
      },
    ],
  },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FrontOfficeRoutingModule {}
