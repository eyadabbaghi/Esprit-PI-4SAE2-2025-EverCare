import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FrontOfficeRoutingModule } from './front-office-routing.module';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ContactComponent } from './pages/contact/contact.component';
import { ServicesComponent } from './pages/services/services.component';
import { PricingComponent } from './pages/pricing/pricing.component';
import { FaqComponent } from './pages/faq/faq.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { FeatureCardComponent } from './components/feature-card/feature-card.component';
import { TestimonialComponent } from './components/testimonial/testimonial.component';
import { TeamMemberComponent } from './components/team-member/team-member.component';
import { ContactFormComponent } from './components/contact-form/contact-form.component';
import { NewsletterComponent } from './components/newsletter/newsletter.component';
import { SharedModule } from '../../shared/shared.module';
import { ActivitiesComponent } from './pages/activities/activities.component';
import { ActivityDetailsComponent } from './pages/activity-details/activity-details.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { NavigationComponent } from './ui/navigation/navigation.component';
import { AiAssistantComponent } from './ui/ai-assistant/ai-assistant.component';
import { WelcomePopupComponent } from './ui/welcome-popup/welcome-popup.component';
import { AlzheimersAssessmentComponent } from './ui/alzheimers-assessment/alzheimers-assessment.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { LucideAngularModule } from 'lucide-angular';
import { NewUserFlowComponent } from './pages/login/new-user-flow.component';
import { SetupProfileComponent } from './pages/setup-profile/setup-profile.component';
import { AlertAlarmComponent } from '../../alert-alarm/alert-alarm.component';
import { FrontOfficeLayoutComponent } from '../../layouts/front-office-layout/front-office-layout.component';

// 👇 ADD THIS IMPORT
import { DoctorSearchModalComponent } from './pages/profile/doctor-search-modal.component';
import { HttpClientModule } from '@angular/common/http';
import { CaregiverCheckComponent } from './pages/alerts/components/caregiver-check/caregiver-check.component';
import { PatientCheckComponent } from './pages/alerts/components/patient-check/patient-check.component';
import { FaceLoginComponent } from './pages/face-login/face-login.component';
import { FaceSetupComponent } from './pages/face-setup/face-setup.component';
import { ConfirmDialogComponent } from './pages/alerts/components/confirm-dialog.component';
import { FaceRecoveryComponent } from './pages/face-recovery/face-recovery.component';
import { AssessmentPageComponent } from './pages/assessment-page/assessment-page.component';


@NgModule({
  declarations: [
    FrontOfficeLayoutComponent,
    HomeComponent,
    AboutComponent,
    ContactComponent,
    ServicesComponent,
    PricingComponent,
    FaqComponent,
    LoginComponent,
    RegisterComponent,
    FeatureCardComponent,
    TestimonialComponent,
    TeamMemberComponent,
    ContactFormComponent,
    NewsletterComponent,
    ActivitiesComponent,
    ActivityDetailsComponent,
    AlertsComponent,
    NavigationComponent,
    AiAssistantComponent,
    WelcomePopupComponent,
    AlzheimersAssessmentComponent,
    ProfileComponent,
    NewUserFlowComponent,
    SetupProfileComponent,
    DoctorSearchModalComponent,
    AlertAlarmComponent,
    CaregiverCheckComponent,
    PatientCheckComponent,
    FaceSetupComponent,
    FaceLoginComponent,
    ConfirmDialogComponent,
    FaceRecoveryComponent,
    AssessmentPageComponent, 
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    FrontOfficeRoutingModule,
    LucideAngularModule,
  ],
  exports: [
    NavigationComponent,
    AiAssistantComponent,
  ],
})
export class FrontOfficeModule {}
