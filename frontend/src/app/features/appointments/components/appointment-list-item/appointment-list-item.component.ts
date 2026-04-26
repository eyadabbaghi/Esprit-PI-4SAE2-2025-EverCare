import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../models/appointment';

@Component({
  selector: 'app-appointment-list-item',
  templateUrl:'appointment-list-item.component.html'
})
export class AppointmentListItemComponent {
  @Input() appointment!: Appointment;
  @Output() onClick = new EventEmitter<Appointment>();

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'SCHEDULED': 'bg-[#F3E8FF] text-[#7C3AED]',
      'CONFIRMED_BY_PATIENT': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'CONFIRMED_BY_CAREGIVER': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'COMPLETED': 'bg-[#F1F5F9] text-[#6B5B8C]',
      'CANCELLED': 'bg-[#FEF2F2] text-[#C06C84]'
    };
    return classes[status] || 'bg-[#F1F5F9] text-[#6B5B8C]';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'SCHEDULED': 'Scheduled',
      'CONFIRMED_BY_PATIENT': 'Confirmed',
      'CONFIRMED_BY_CAREGIVER': 'Confirmed',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }
}
