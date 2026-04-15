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
import { FaceLoginComponent } from './pages/face-login/face-login.component';
import { FaceSetupComponent } from './pages/face-setup/face-setup.component';

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
      { path: 'setup-face-id', component: FaceSetupComponent },
      { path: 'face-login', component: FaceLoginComponent },
      { path: 'blog', loadChildren: () => import('../blog/blog.module').then(m => m.BlogModule) },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FrontOfficeRoutingModule {}
