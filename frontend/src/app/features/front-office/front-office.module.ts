import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FrontOfficeRoutingModule } from './front-office-routing.module';

import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ActivitiesComponent } from './pages/activities/activities.component';
import { ActivityDetailsComponent } from './pages/activity-details/activity-details.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { ProfileComponent } from './pages/profile/profile.component';

// your UI components...
import { NavigationComponent } from './ui/navigation/navigation.component';
import { AiAssistantComponent } from './ui/ai-assistant/ai-assistant.component';
import { WelcomePopupComponent } from './ui/welcome-popup/welcome-popup.component';
import { AlzheimersAssessmentComponent } from './ui/alzheimers-assessment/alzheimers-assessment.component';

import { SharedModule } from '../../shared/shared.module';
import { LucideAngularModule } from 'lucide-angular';
import { NewUserFlowComponent } from './pages/login/new-user-flow.component';


import { DailyMeModule } from '../daily-me/daily-me.module';

@NgModule({
  declarations: [
    HomeComponent,
    LoginComponent,
    ActivitiesComponent,
    ActivityDetailsComponent,
    AlertsComponent,
    ProfileComponent,

    NavigationComponent,
    AiAssistantComponent,
    WelcomePopupComponent,
    AlzheimersAssessmentComponent,
    NewUserFlowComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FrontOfficeRoutingModule,
    LucideAngularModule,

    
    DailyMeModule,
  ],
  exports: [
    NavigationComponent,
    AiAssistantComponent,
  ],
})
export class FrontOfficeModule {}
