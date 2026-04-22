import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppointmentsRoutingModule } from './appointments-routing.module';
import { AppointmentListComponent } from './pages/appointment-list/appointment-list.component';
import { AppointmentFormComponent } from './pages/appointment-form/appointment-form.component';
import { AppointmentDetailsComponent } from './pages/appointment-details/appointment-details.component';
import { CalendarViewComponent } from './pages/calendar-view/calendar-view.component';
import { BookingComponent } from './pages/booking/booking.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { TimeSlotsComponent } from './components/time-slots/time-slots.component';
import { AppointmentCardComponent } from './components/appointment-card/appointment-card.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { ReminderSettingsComponent } from './components/reminder-settings/reminder-settings.component';


@NgModule({
  declarations: [
    AppointmentListComponent,
    AppointmentFormComponent,
    AppointmentDetailsComponent,
    CalendarViewComponent,
    BookingComponent,
    CalendarComponent,
    TimeSlotsComponent,
    AppointmentCardComponent,
    StatusBadgeComponent,
    ReminderSettingsComponent
  ],
  imports: [
    CommonModule,
    AppointmentsRoutingModule
  ]
})
export class AppointmentsModule { }
