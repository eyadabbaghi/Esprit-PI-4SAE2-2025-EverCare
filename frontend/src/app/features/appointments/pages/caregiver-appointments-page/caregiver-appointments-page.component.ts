import { Component, OnInit } from '@angular/core';
import { Appointment } from '../../../appointments/models/appointment';
import { User } from '../../models/user';
import { AppointmentService } from '../../services/appointments.service';
import { AuthService } from '../../../front-office/pages/login/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {CaregiverPatientService} from '../../services/patient-caregiver-relation.service';

@Component({
  selector: 'app-caregiver-appointments-page',
  templateUrl: './caregiver-appointments-page.component.html'
})
export class CaregiverAppointmentsPageComponent implements OnInit {
  currentCaregiver: User | null = null;
  patient: User | null = null;
  appointments: Appointment[] = [];
  selectedAppointment: Appointment | null = null;

  loading = false;
  errorMessage = '';
  successMessage = '';
  showDetailsModal = false;

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private patientCaregiverService: CaregiverPatientService
  ) {}

  ngOnInit(): void {
    this.loadCurrentCaregiver();
  }

  loadCurrentCaregiver(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user && user.role === 'CAREGIVER') {
          this.currentCaregiver = user;
          console.log('✅ Caregiver loaded:', this.currentCaregiver);
          // After loading caregiver, load their patient
          this.loadPatientForCaregiver();
        } else if (user && user.role !== 'CAREGIVER') {
          this.toastr.error('Access denied. This page is for caregivers only.');
          this.router.navigate(['/']);
        } else {
          this.toastr.warning('Please log in to access your appointments');
          this.router.navigate(['/login']);
        }
      },
      error: (error) => {
        console.error('❌ Error loading caregiver:', error);
        this.errorMessage = 'Failed to load user information';
        this.loading = false;
      }
    });
  }

  /**
   * Load the patient assigned to this caregiver using the relation service
   */
  loadPatientForCaregiver(): void {
    if (!this.currentCaregiver?.userId) {
      this.errorMessage = 'Caregiver ID not found';
      this.loading = false;
      return;
    }

    console.log('🔍 Loading patient for caregiver ID:', this.currentCaregiver.userId);

    this.patientCaregiverService.getPatientsByCaregiverId(this.currentCaregiver.userId)
      .subscribe({
        next: (patients) => {
          console.log('📦 Patients received:', patients);

          if (patients && patients.length > 0) {
            // Take the first patient (assuming one patient per caregiver)
            this.patient = patients[0];
            console.log('✅ Patient assigned:', this.patient);

            // Load appointments for this patient
            if (this.patient.userId) {
              this.loadAppointments(this.patient.userId);
            } else {
              this.errorMessage = 'Patient ID not found';
              this.loading = false;
            }
          } else {
            console.log('⚠️ No patients found for this caregiver');
            this.errorMessage = 'No patient assigned to you';
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('❌ Error loading patients:', error);

          // Handle specific error cases
          if (error.status === 401) {
            this.toastr.error('Session expired. Please login again.');
            this.router.navigate(['/login']);
          } else if (error.status === 403) {
            this.toastr.error('You do not have permission to access this resource.');
          } else if (error.status === 404) {
            this.errorMessage = 'Patient endpoint not found';
          } else if (error.status === 0) {
            this.errorMessage = 'Cannot connect to server. Please check if backend is running.';
          } else {
            this.errorMessage = 'Failed to load patient information';
          }
          this.loading = false;
        }
      });
  }

  /**
   * Load appointments for a patient
   */
  loadAppointments(patientId: string): void {
    console.log('📅 Loading appointments for patient:', patientId);

    this.appointmentService.getAppointmentsByPatient(patientId).subscribe({
      next: (data) => {
        this.appointments = data;
        console.log('✅ Appointments loaded:', this.appointments.length);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading appointments:', error);
        this.errorMessage = 'Failed to load appointments';
        this.loading = false;
      }
    });
  }

  /**
   * View appointment details
   */
  viewAppointmentDetails(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showDetailsModal = true;
  }

  /**
   * Close details modal
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedAppointment = null;
  }

  /**
   * Confirm an appointment as caregiver
   */
  confirmAppointment(appointmentId: string): void {
    this.loading = true;

    this.appointmentService.confirmByCaregiver(appointmentId).subscribe({
      next: (updatedAppointment) => {
        // Update in the list
        const index = this.appointments.findIndex(a => a.appointmentId === appointmentId);
        if (index !== -1) {
          this.appointments[index] = updatedAppointment;
        }

        this.closeDetailsModal();
        this.loading = false;
        this.toastr.success('Appointment confirmed successfully');
      },
      error: (error) => {
        console.error('Error confirming appointment:', error);
        this.toastr.error('Failed to confirm appointment');
        this.loading = false;
      }
    });
  }

  /**
   * Join a video call
   */
  joinVideoCall(videoLink: string | undefined): void {
    if (videoLink) {
      window.open(videoLink, '_blank');
    } else {
      this.toastr.warning('No video link available for this appointment');
    }
  }

  /**
   * Check if appointment can be confirmed
   */
  canConfirm(appointment: Appointment): boolean {
    return appointment.status === 'SCHEDULED' ||
      appointment.status === 'CONFIRMED_BY_PATIENT';
  }

  /**
   * Check if user can join video call
   */
  canJoinCall(appointment: Appointment): boolean {
    const now = new Date();
    const appointmentTime = new Date(appointment.startDateTime);
    const diffMinutes = (appointmentTime.getTime() - now.getTime()) / 60000;

    return (appointment.status === 'CONFIRMED_BY_CAREGIVER' ||
        appointment.status === 'CONFIRMED_BY_PATIENT') &&
      diffMinutes <= 15 && diffMinutes >= -30;
  }

  /**
   * Get upcoming appointments
   */
  getUpcomingAppointments(): Appointment[] {
    const now = new Date();
    return this.appointments
      .filter(apt => new Date(apt.startDateTime) > now)
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  }

  /**
   * Get past appointments
   */
  getPastAppointments(): Appointment[] {
    const now = new Date();
    return this.appointments
      .filter(apt => new Date(apt.startDateTime) < now)
      .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
  }

  /**
   * Calculate patient age
   */
  getPatientAge(): number {
    if (!this.patient?.dateOfBirth) return 0;
    const birthDate = new Date(this.patient.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }


  /**
   * Get CSS class for appointment status
   */
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
}
