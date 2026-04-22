import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BackOfficeRoutingModule } from './back-office-routing.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UsersComponent } from './pages/users/users.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { StatsCardComponent } from './components/stats-card/stats-card.component';
import { UserTableComponent } from './components/user-table/user-table.component';
import { ChartWidgetComponent } from './components/chart-widget/chart-widget.component';
import { NotificationPanelComponent } from './components/notification-panel/notification-panel.component';
import { ActivitiesAdminComponent } from './pages/activities-admin/activities-admin.component';
import { ActivityDetailsAdminComponent } from './pages/activity-details-admin/activity-details-admin.component';

@NgModule({
  declarations: [
    DashboardComponent,
    UsersComponent,
    SettingsComponent,
    AnalyticsComponent,
    ReportsComponent,
    ProfileComponent,
    StatsCardComponent,
    UserTableComponent,
    ChartWidgetComponent,
    NotificationPanelComponent,
    ActivitiesAdminComponent,
    ActivityDetailsAdminComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BackOfficeRoutingModule
  ]
})
export class BackOfficeModule { }