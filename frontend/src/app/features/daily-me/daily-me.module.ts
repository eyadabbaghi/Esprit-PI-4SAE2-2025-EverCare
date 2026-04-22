import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BaseChartDirective } from 'ng2-charts'; // ✅ IMPORTANT

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
    BaseChartDirective // ✅ this makes baseChart + [data]/[options]/[type] work
  ],
  exports: [
    DailyMeListComponent,
    DailyTaskListComponent,
    JournalComponent
  ]
})
export class DailyMeModule {}