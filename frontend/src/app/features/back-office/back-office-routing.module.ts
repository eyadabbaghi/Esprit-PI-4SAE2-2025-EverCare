import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BackOfficeLayoutComponent } from '../../layouts/back-office-layout/back-office-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ActivitiesAdminComponent } from './pages/activities-admin/activities-admin.component';
import { ActivityDetailsAdminComponent } from './pages/activity-details-admin/activity-details-admin.component';
import { MedicamentsAdminComponent } from './pages/medicaments-admin/medicaments-admin.component';
import { MedicamentEditorPlaceholderComponent } from './pages/medicament-editor-placeholder/medicament-editor-placeholder.component';
import { MedicamentsAnalyticsComponent } from './pages/medicaments-analytics/medicaments-analytics.component';
import { MedicamentDetailsComponent } from './pages/medicament-details/medicament-details.component';
import { AdminGuard } from '../../core/guards/admin.guard';

const routes: Routes = [
  {
    path: 'admin',
    component: BackOfficeLayoutComponent,
   // canActivate: [AdminGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'activities', component: ActivitiesAdminComponent },
      { path: 'activities/:id', component: ActivityDetailsAdminComponent },
      { path: 'medicaments', component: MedicamentsAdminComponent },
      { path: 'medicaments/analytics', component: MedicamentsAnalyticsComponent },
      { path: 'medicaments/new', component: MedicamentEditorPlaceholderComponent },
      { path: 'medicaments/:id', component: MedicamentDetailsComponent },
      { path: 'medicaments/:id/edit', component: MedicamentEditorPlaceholderComponent },
      { path: 'users', component: UsersComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'profile', component: ProfileComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BackOfficeRoutingModule { }
