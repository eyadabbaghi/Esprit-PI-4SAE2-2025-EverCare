import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Appointment } from '../../models/appointment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-appointment-details',
  templateUrl: './appointment-details.component.html',
})
export class AppointmentDetailsComponent {
  @Input() appointment: Appointment | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<string>();
  @Output() onJoinCall = new EventEmitter<string>();

  constructor(private router: Router) {}

  joinVideoCall(): void {
    if (this.appointment) {
      this.router.navigate(['/appointments/video', this.appointment.appointmentId]);
    }
  }

  getStatusClass(status: any): string {
    const classes = {
      'SCHEDULED': 'bg-[#F3E8FF] text-[#7C3AED]',
      'CONFIRMED_BY_PATIENT': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'CONFIRMED_BY_CAREGIVER': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'COMPLETED': 'bg-[#F1F5F9] text-[#6B5B8C]',
      'CANCELLED': 'bg-[#FEF2F2] text-[#C06C84]'
    };
    return classes[status as keyof typeof classes] || 'bg-[#F1F5F9] text-[#6B5B8C]';
  }

  getStatusLabel(status: any): string {
    const labels = {
      'SCHEDULED': 'Pending confirmation',
      'CONFIRMED_BY_PATIENT': 'Confirmed',
      'CONFIRMED_BY_CAREGIVER': 'Confirmed',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getPresenceLabel(presence?: string): string {
    const labels = {
      'PHYSICAL': 'Caregiver present',
      'REMOTE': 'Caregiver remote',
      'NONE': 'No caregiver'
    };
    return presence ? labels[presence as keyof typeof labels] : 'No caregiver';
  }

  getDuration(): number {
    if (!this.appointment) return 0;
    const diff = this.appointment.endDateTime.getTime() - this.appointment.startDateTime.getTime();
    return Math.round(diff / 60000);
  }

  showConfirmButton(): boolean {
    return this.appointment?.status === 'SCHEDULED' &&
      this.appointment?.startDateTime > new Date();
  }

  showCancelButton(): boolean {
    return this.appointment?.status !== 'CANCELLED' &&
      this.appointment?.status !== 'COMPLETED';
  }
}
