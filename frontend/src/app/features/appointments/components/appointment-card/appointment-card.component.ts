import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  // Helper method to safely get Date object
  private getAppointmentDate(): Date | null {
    if (!this.appointment?.startDateTime) return null;

    try {
      const date = new Date(this.appointment.startDateTime);
      // Check if date is valid
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
    // Define with all possible statuses including IN_PROGRESS
    const classes: Record<AppointmentStatus, string> = {
      'SCHEDULED': 'bg-[#F3E8FF] text-[#7C3AED]',
      'CONFIRMED_BY_PATIENT': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'CONFIRMED_BY_CAREGIVER': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'IN_PROGRESS': 'bg-[#DBEAFE] text-[#1E40AF]', // Add IN_PROGRESS style
      'COMPLETED': 'bg-[#F1F5F9] text-[#6B5B8C]',
      'CANCELLED': 'bg-[#FEF2F2] text-[#C06C84]',
      'RESCHEDULED': 'bg-[#FFF3E0] text-[#F97316]',
      'MISSED': 'bg-[#FEF2F2] text-[#DC2626]'
    };

    return classes[status] || 'bg-[#F1F5F9] text-[#6B5B8C]';
  }

  getStatusLabel(status: AppointmentStatus): string {
    // Define with all possible statuses including IN_PROGRESS
    const labels: Record<AppointmentStatus, string> = {
      'SCHEDULED': 'À confirmer',
      'CONFIRMED_BY_PATIENT': 'Confirmé',
      'CONFIRMED_BY_CAREGIVER': 'Confirmé',
      'IN_PROGRESS': 'En cours', // Add IN_PROGRESS label
      'COMPLETED': 'Terminé',
      'CANCELLED': 'Annulé',
      'RESCHEDULED': 'Reporté',
      'MISSED': 'Manqué'
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
      return `${appointment.caregiverName} présent`;
    }
    if (presence === 'REMOTE' && appointment.caregiverName) {
      return `${appointment.caregiverName} en visio`;
    }
    return appointment.caregiverName || 'Aucun aidant';
  }

  canJoinCall(): boolean {
    // Check if appointment exists
    if (!this.appointment) return false;

    // Check status - allow joining for IN_PROGRESS as well
    if (this.appointment.status !== 'CONFIRMED_BY_PATIENT' &&
      this.appointment.status !== 'CONFIRMED_BY_CAREGIVER' &&
      this.appointment.status !== 'IN_PROGRESS') {
      return false;
    }

    try {
      // Safely convert to Date
      const appointmentDate = this.getAppointmentDate();
      if (!appointmentDate) return false;

      const now = new Date();
      const diffMinutes = (appointmentDate.getTime() - now.getTime()) / 60000;

      // Allow joining 5 minutes before and up to 30 minutes after
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
      return 'Confirmer';
    }
    if (this.canJoinCall()) {
      return 'Rejoindre';
    }
    return '';
  }

  // Optional: Add helper method for formatted time display
  getFormattedTime(): string {
    const appointmentDate = this.getAppointmentDate();
    if (!appointmentDate) return '';

    return appointmentDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Optional: Add helper to check if appointment is today
  isToday(): boolean {
    const appointmentDate = this.getAppointmentDate();
    if (!appointmentDate) return false;

    const today = new Date();
    return appointmentDate.toDateString() === today.toDateString();
  }

  // Optional: Add helper to check if appointment needs action
  needsAction(): boolean {
    return this.appointment.status === 'SCHEDULED' || this.canJoinCall();
  }

  // Optional: Check if appointment is in progress
  isInProgress(): boolean {
    return this.appointment.status === 'IN_PROGRESS';
  }
}
