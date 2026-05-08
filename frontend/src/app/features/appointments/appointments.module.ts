import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentsRoutingModule } from './appointments-routing.module';
import { AppointmentsPageComponent } from './pages/appointments-page/appointments-page.component';
import { FormsModule } from '@angular/forms';
import { CalendarComponent } from './components/calendar/calendar.component';
import { AppointmentFiltersComponent } from './components/appointment-filters/appointment-filters.component';
import { AppointmentCardComponent } from './components/appointment-card/appointment-card.component';
import { AppointmentListComponent } from './components/appointment-list/appointment-list.component';
import { AppointmentDetailsComponent } from './components/appointment-details/appointment-details.component';
import { AppointmentFormComponent } from './components/appointment-form/appointment-form.component';
import { DoctorHeaderComponent } from './components/doctor-header/doctor-header.component';
import { StatsCardsComponent } from './components/stats-cards/stats-cards.component';
import { TimelineAppointmentCardComponent } from './components/timeline-appointment-card/timeline-appointment-card.component';
import { TodayScheduleComponent } from './components/today-schedule/today-schedule.component';
import { AppointmentListItemComponent } from './components/appointment-list-item/appointment-list-item.component';
import { UpcomingAppointmentsComponent } from './components/upcoming-appointments/upcoming-appointments.component';
import { RecentPatientsTableComponent } from './components/recent-patients-table/recent-patients-table.component';
import { AppointmentDetailsModalComponent } from './components/appointment-details-modal/appointment-details-modal.component';
import { DoctorAppointmentsPageComponent } from './pages/doctor-appointments-page/doctor-appointments-page.component';
import { DoctorCalendarComponent } from './components/doctor-calendar/doctor-calendar.component';
import { DoctorAvailabilityComponent } from './components/doctor-availability/doctor-availability.component';
import { WeeklyScheduleComponent } from './components/weekly-schedule/weekly-schedule.component';
import { DoctorTabsComponent } from './components/doctor-tabs/doctor-tabs.component';
import { ExceptionFormModalComponent } from './components/exception-form-modal/exception-form-modal.component';
import { ConsultationTypeManagerComponent } from './components/consultation-type-manager/consultation-type-manager.component';
import { AvailabilityManagerComponent } from './components/availability-management/availability-management.component';
import { CaregiverAppointmentsPageComponent } from './pages/caregiver-appointments-page/caregiver-appointments-page.component';
import { RouterModule } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';

// NEW: Video consultation
import { VideoConsultationPageComponent } from './pages/video-consultation-page/video-consultation-page.component';
import { JitsiMeetComponent } from './components/jitsi-meet/jitsi-meet.component';
import { UserAppointmentsComponent } from './pages/user-appointments/user-appointments.component';

@NgModule({
  declarations: [
    AppointmentsPageComponent,
    CalendarComponent,
    AppointmentFiltersComponent,
    AppointmentCardComponent,
    AppointmentListComponent,
    AppointmentDetailsComponent,
    AppointmentFormComponent,
    DoctorHeaderComponent,
    StatsCardsComponent,
    TimelineAppointmentCardComponent,
    TodayScheduleComponent,
    AppointmentListItemComponent,
    UpcomingAppointmentsComponent,
    RecentPatientsTableComponent,
    AppointmentDetailsModalComponent,
    DoctorAppointmentsPageComponent,
    DoctorCalendarComponent,
    DoctorAvailabilityComponent,
    DoctorTabsComponent,
    AvailabilityManagerComponent,
    ExceptionFormModalComponent,
    ConsultationTypeManagerComponent,
    // NEW
    VideoConsultationPageComponent,
    JitsiMeetComponent,
    UserAppointmentsComponent,
  ],
  imports: [
    CommonModule,
    AppointmentsRoutingModule,
    FormsModule,
    CaregiverAppointmentsPageComponent,
    WeeklyScheduleComponent,
    RouterModule,
    ToastrModule.forRoot(),
    LucideAngularModule,
    
  ]
})
export class AppointmentsModule { }
