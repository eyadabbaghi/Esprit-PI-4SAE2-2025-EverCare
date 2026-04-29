import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../models/appointment';
import { AppointmentListItemComponent } from '../appointment-list-item/appointment-list-item.component';

@Component({
  selector: 'app-upcoming-appointments',
  templateUrl: 'upcoming-appointments.component.html',
})
export class UpcomingAppointmentsComponent {
  @Input() appointments: Appointment[] = [];
  @Output() onCardClick = new EventEmitter<Appointment>();
  @Output() onDateSelected = new EventEmitter<string>();

  viewMode: 'list' | 'calendar' = 'list';
}
