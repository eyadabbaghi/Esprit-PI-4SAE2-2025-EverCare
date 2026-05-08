import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Appointment } from '../../models/appointment';

@Component({
  selector: 'app-appointment-list',
  templateUrl: './appointment-list.component.html',
})
export class AppointmentListComponent {
  @Input() title: string = 'Appointments';
  @Input() appointments: Appointment[] = [];
  @Input() emptyMessage: string = 'No appointments found';
  @Input() addButtonText: string = 'Book appointment';
  @Input() showAddButton: boolean = false;
  @Input() showActionButtons: boolean = true;
  @Input() scrollable: boolean = false;

  @Output() onCardClick = new EventEmitter<Appointment>();
  @Output() onAction = new EventEmitter<Appointment>();
  @Output() onAddClick = new EventEmitter<void>();
}
