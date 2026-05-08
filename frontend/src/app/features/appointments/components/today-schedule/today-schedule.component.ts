import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Appointment } from '../../models/appointment';

@Component({
  selector: 'app-today-schedule',

  templateUrl: 'today-schedule.component.html',
})
export class TodayScheduleComponent {
  @Input() appointments: Appointment[] = [];

  @Output() onCardClick = new EventEmitter<Appointment>();
  @Output() onStart = new EventEmitter<Appointment>();
  @Output() onJoin = new EventEmitter<string>();
  @Output() onViewProfile = new EventEmitter<string>();
}
