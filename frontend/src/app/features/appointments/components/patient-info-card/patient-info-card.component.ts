import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../appointments/models/user';

@Component({
  selector: 'app-patient-info-card',

  templateUrl: './patient-info-card.component.html',
})
export class PatientInfoCardComponent {
  @Input() patient: User | null = null;
  @Input() age: number = 0;
  @Input() totalAppointments: number = 0;


}
