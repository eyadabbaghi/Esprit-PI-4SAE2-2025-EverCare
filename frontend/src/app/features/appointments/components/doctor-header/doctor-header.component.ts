import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user';

@Component({
  selector: 'app-doctor-header',

  templateUrl: './doctor-header.component.html',
})
export class DoctorHeaderComponent {
  @Input() doctor!: User;
  today: Date = new Date();
}
