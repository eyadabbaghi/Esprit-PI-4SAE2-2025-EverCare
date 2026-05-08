import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Appointment, AppointmentStatus, CaregiverPresence } from '../../models/appointment';

@Component({
  selector: 'app-appointment-card',
  templateUrl: './appointment-card.component.html',
})
export class AppointmentCardComponent {
  @Input() appointment!: Appointment;
  @Input() showActionButton: boolean = true;
  @Output() onClick = new EventEmitter<Appointment>();
  @Output() onAction = new EventEmitter<Appointment>();

  private getAppointmentDate(): Date | null {
    if (!this.appointment?.startDateTime) return null;

    try {
      const date = new Date(this.appointment.startDateTime);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  getCardClass(): string {
    if (this.appointment.status === 'COMPLETED') {
      return 'bg-[#F9FAFB] border-[#E5E7EB] opacity-70';
    }
    return 'bg-white border-[#C4B5FD] hover:shadow-md';
  }

  getStatusClass(status: AppointmentStatus): string {
    const classes: Record<AppointmentStatus, string> = {
      'SCHEDULED': 'bg-[#F3E8FF] text-[#7C3AED]',
      'CONFIRMED_BY_PATIENT': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'CONFIRMED_BY_CAREGIVER': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'IN_PROGRESS': 'bg-[#DBEAFE] text-[#1E40AF]',
      'COMPLETED': 'bg-[#F1F5F9] text-[#6B5B8C]',
      'CANCELLED': 'bg-[#FEF2F2] text-[#C06C84]',
      'RESCHEDULED': 'bg-[#FFF3E0] text-[#F97316]',
      'MISSED': 'bg-[#FEF2F2] text-[#DC2626]'
    };

    return classes[status] || 'bg-[#F1F5F9] text-[#6B5B8C]';
  }

  getStatusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      'SCHEDULED': 'Pending confirmation',
      'CONFIRMED_BY_PATIENT': 'Confirmed',
      'CONFIRMED_BY_CAREGIVER': 'Confirmed',
      'IN_PROGRESS': 'In progress',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'RESCHEDULED': 'Rescheduled',
      'MISSED': 'Missed'
    };

    return labels[status] || status;
  }

  getCaregiverClass(presence?: CaregiverPresence): string {
    if (!presence) return 'bg-[#E6F0FA] text-[#2D1B4E]';

    const classes: Record<CaregiverPresence, string> = {
      'PHYSICAL': 'bg-[#F3E8FF] text-[#7C3AED]',
      'REMOTE': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'NONE': 'bg-[#E6F0FA] text-[#2D1B4E]'
    };

    return classes[presence];
  }

  getCaregiverIconClass(presence?: CaregiverPresence): string {
    if (!presence) return 'text-[#2D1B4E]';

    const classes: Record<CaregiverPresence, string> = {
      'PHYSICAL': 'text-[#7C3AED]',
      'REMOTE': 'text-[#2D1B4E]',
      'NONE': 'text-[#2D1B4E]'
    };

    return classes[presence];
  }

  getCaregiverLabel(appointment: Appointment): string {
    const presence = appointment.caregiverPresence;
    if (presence === 'PHYSICAL' && appointment.caregiverName) {
      return `${appointment.caregiverName} present`;
    }
    if (presence === 'REMOTE' && appointment.caregiverName) {
      return `${appointment.caregiverName} remote`;
    }
    return appointment.caregiverName || 'No caregiver';
  }

  canJoinCall(): boolean {
    if (!this.appointment) return false;

    if (this.appointment.status !== 'CONFIRMED_BY_PATIENT' &&
      this.appointment.status !== 'CONFIRMED_BY_CAREGIVER' &&
      this.appointment.status !== 'IN_PROGRESS') {
      return false;
    }

    try {
      const appointmentDate = this.getAppointmentDate();
      if (!appointmentDate) return false;

      const now = new Date();
      const diffMinutes = (appointmentDate.getTime() - now.getTime()) / 60000;

      return diffMinutes <= 15 && diffMinutes >= -30;
    } catch {
      return false;
    }
  }

  getActionButtonClass(): string {
    if (this.appointment.status === 'SCHEDULED') {
      return 'bg-[#7C3AED] hover:bg-[#6D28D9]';
    }
    if (this.canJoinCall()) {
      return 'bg-green-600 hover:bg-green-700';
    }
    return '';
  }

  getActionButtonText(): string {
    if (this.appointment.status === 'SCHEDULED') {
      return 'Confirm';
    }
    if (this.canJoinCall()) {
      return 'Join';
    }
    return '';
  }

  getFormattedTime(): string {
    const appointmentDate = this.getAppointmentDate();
    if (!appointmentDate) return '';

    return appointmentDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isToday(): boolean {
    const appointmentDate = this.getAppointmentDate();
    if (!appointmentDate) return false;

    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString();
  }

  needsAction(): boolean {
    return this.appointment.status === 'SCHEDULED' || this.canJoinCall();
  }

  isInProgress(): boolean {
    return this.appointment.status === 'IN_PROGRESS';
  }
}
