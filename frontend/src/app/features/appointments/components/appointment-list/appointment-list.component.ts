import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../models/appointment';
import { AppointmentCardComponent } from '../appointment-card/appointment-card.component';

@Component({
  selector: 'app-appointment-list',
  templateUrl: './appointment-list.component.html',
})
export class AppointmentListComponent {
  @Input() title: string = 'Rendez-vous';
  @Input() appointments: Appointment[] = [];
  @Input() emptyMessage: string = 'Aucun rendez-vous trouvé';
  @Input() addButtonText: string = 'Prendre rendez-vous';
  @Input() showAddButton: boolean = false;
  @Input() showActionButtons: boolean = true;
  @Input() scrollable: boolean = false;

  @Output() onCardClick = new EventEmitter<Appointment>();
  @Output() onAction = new EventEmitter<Appointment>();
  @Output() onAddClick = new EventEmitter<void>();
}
