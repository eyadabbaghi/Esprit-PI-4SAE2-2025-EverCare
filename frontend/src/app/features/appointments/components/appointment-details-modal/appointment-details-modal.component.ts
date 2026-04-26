import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Appointment } from '../../models/appointment';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../front-office/pages/login/auth.service';

@Component({
  selector: 'app-appointment-details-modal',
  templateUrl: "appointment-details-modal.component.html"
})
export class AppointmentDetailsModalComponent {
  @Input() appointment: Appointment | null = null;
  @Input() patientBirthDate?: Date;
  @Input() patientAge?: number;
  @Input() patientAlzheimerStage?: string;
  @Input() emergencyContact?: string;
  @Input() previousVisits?: number;

  @Output() onClose = new EventEmitter<void>();
  @Output() onStart = new EventEmitter<Appointment>();
  @Output() onPrescribe = new EventEmitter<void>();
  @Output() onEditNotes = new EventEmitter<void>();
  @Output() onNotesChange = new EventEmitter<string>();

  userRole: string = '';

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userRole = user.role || '';
      }
    });
  }

  getDuration(): number {
    if (!this.appointment) return 0;
    const diff = new Date(this.appointment.endDateTime).getTime() -
      new Date(this.appointment.startDateTime).getTime();
    return Math.round(diff / 60000);
  }

  get showStartButton(): boolean {
    return !!(this.appointment &&
      (this.appointment.status === 'SCHEDULED' ||
        this.appointment.status === 'CONFIRMED_BY_PATIENT'));
  }

  canStartVideoCall(): boolean {
    return !!(this.appointment && (
      this.appointment.status === 'CONFIRMED_BY_PATIENT' ||
      this.appointment.status === 'CONFIRMED_BY_CAREGIVER' ||
      this.appointment.status === 'SCHEDULED'
    ));
  }

  isDoctor(): boolean {
    return this.userRole === 'DOCTOR';
  }

  // ✅ Simple Jitsi navigation — same room for doctor and patient
  startVideoConsultation(): void {
    if (!this.appointment) {
      this.toastr.error('No appointment selected');
      return;
    }
    this.onClose.emit();
    this.router.navigate(['/appointments/video', this.appointment.appointmentId]);
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
      'CONFIRMED_BY_PATIENT': 'Confirmed by Patient',
      'CONFIRMED_BY_CAREGIVER': 'Confirmed by Caregiver',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  getPresenceLabel(presence?: string): string {
    const labels: Record<string, string> = {
      'PHYSICAL': 'Caregiver present',
      'REMOTE': 'Caregiver remote',
      'NONE': 'No caregiver'
    };
    return presence ? labels[presence] : 'No caregiver';
  }
}
