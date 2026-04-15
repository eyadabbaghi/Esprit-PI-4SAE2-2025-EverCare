import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import {DoctorStats} from '../../models/doctor-stats';

@Component({
  selector: 'app-stats-cards',
  templateUrl: 'stats-cards.component.html',
})
export class StatsCardsComponent {
  @Input() stats!: DoctorStats;
}
