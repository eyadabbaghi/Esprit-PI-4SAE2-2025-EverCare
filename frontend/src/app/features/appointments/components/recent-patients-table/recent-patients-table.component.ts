import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RecentPatient} from '../../models/recent-patient';

@Component({
  selector: 'app-recent-patients-table',

  templateUrl: 'recent-patients-table.component.html',
})
export class RecentPatientsTableComponent {
  @Input() patients: RecentPatient[] = [];
  @Output() onViewHistory = new EventEmitter<string>();

  getStageClass(stage: string): string {
    const classes: Record<string, string> = {
      'LEGER': 'bg-[#F3E8FF] text-[#7C3AED]',
      'MODERE': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'AVANCE': 'bg-[#F1F5F9] text-[#6B5B8C]'
    };
    return classes[stage] || 'bg-[#F1F5F9] text-[#6B5B8C]';
  }
}
