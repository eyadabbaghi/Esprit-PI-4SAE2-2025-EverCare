import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../.././models/appointment';
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';

@Component({
  selector: 'app-appointments-list',
  templateUrl: './appointments-list.component.html',
})
export class AppointmentsListComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() emptyMessage: string = 'No appointments found';
  @Input() appointments: Appointment[] = [];
  @Input() canConfirmFn?: (appointment: Appointment) => boolean;
  @Input() canJoinCallFn?: (appointment: Appointment) => boolean;

  @Output() onCardClick = new EventEmitter<Appointment>();
  @Output() onConfirm = new EventEmitter<string>();
  @Output() onJoinCall = new EventEmitter<string>();

  canConfirm(appointment: Appointment): boolean {
    return this.canConfirmFn ? this.canConfirmFn(appointment) : false;
  }

  canJoinCall(appointment: Appointment): boolean {
    return this.canJoinCallFn ? this.canJoinCallFn(appointment) : false;
  }
}
