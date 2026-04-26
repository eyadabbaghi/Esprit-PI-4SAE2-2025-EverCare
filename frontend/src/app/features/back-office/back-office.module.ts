import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { BackOfficeLayoutComponent } from '../../layouts/back-office-layout/back-office-layout.component';

import { ActivitiesAdminComponent } from './pages/activities-admin/activities-admin.component';
import { ActivityDetailsAdminComponent } from './pages/activity-details-admin/activity-details-admin.component';
import { MedicamentsAdminComponent } from './pages/medicaments-admin/medicaments-admin.component';
import { MedicamentEditorPlaceholderComponent } from './pages/medicament-editor-placeholder/medicament-editor-placeholder.component';
import { MedicamentsAnalyticsComponent } from './pages/medicaments-analytics/medicaments-analytics.component';
import { MedicamentDetailsComponent } from './pages/medicament-details/medicament-details.component';

// Import the image cropper standalone component
import { ImageCropperComponent } from 'ngx-image-cropper';

@NgModule({
  declarations: [
    BackOfficeLayoutComponent,
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
    ActivityDetailsAdminComponent,
    MedicamentsAdminComponent,
    MedicamentEditorPlaceholderComponent,
    MedicamentsAnalyticsComponent,
    MedicamentDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    BackOfficeRoutingModule,
    ImageCropperComponent // standalone component (Angular >=14+)
  ]
})
export class BackOfficeModule { }
