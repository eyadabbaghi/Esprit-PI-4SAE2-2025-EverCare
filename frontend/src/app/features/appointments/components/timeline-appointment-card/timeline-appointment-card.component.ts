import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Appointment } from '../../models/appointment';

@Component({
  selector: 'app-timeline-appointment-card',

  templateUrl: './timeline-appointment-card.component.html',
})
export class TimelineAppointmentCardComponent {
  @Input() appointment!: Appointment;
  @Input() isLast: boolean = false;
  @Input() cognitiveInfo?: string;

  @Output() onClick = new EventEmitter<Appointment>();
  @Output() onStart = new EventEmitter<Appointment>();
  @Output() onJoin = new EventEmitter<string>();
  @Output() onViewProfile = new EventEmitter<string>();

  getDuration(): number {
    const diff = this.appointment.endDateTime.getTime() - this.appointment.startDateTime.getTime();
    return Math.round(diff / 60000);
  }

  get showStartButton(): boolean {
    return this.appointment.status === 'SCHEDULED' ||
      this.appointment.status === 'CONFIRMED_BY_PATIENT';
  }

  get showJoinButton(): boolean {
    return !!(this.appointment.videoLink &&
      (this.appointment.status === 'CONFIRMED_BY_PATIENT' ||
        this.appointment.status === 'CONFIRMED_BY_CAREGIVER'));
  }

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
