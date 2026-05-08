import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { SharedModule } from '../../shared/shared.module';

import { DailyMeRoutingModule } from './daily-me-routing.module'; // ✅ Add this

import { JournalComponent } from '../journal/journal.component';
import { DailyMeListComponent } from './daily-me-list/daily-me-list.component';
import { DailyTaskListComponent } from './daily-task-list/daily-task-list.component';

@NgModule({
  declarations: [
    DailyMeListComponent,
    DailyTaskListComponent,
    JournalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    SharedModule,
    DailyMeRoutingModule // ✅ Add routing here
  ],
  exports: [
    DailyMeListComponent,
    DailyTaskListComponent,
    JournalComponent
  ]
})
export class DailyMeModule { }
