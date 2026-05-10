import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment } from '../../../appointments/models/appointment';
import { User } from '../../models/user';
import { AppointmentService } from '../../services/appointments.service';
import { AuthService } from '../../../front-office/pages/login/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {CaregiverPatientService} from '../../services/patient-caregiver-relation.service';
import { ClinicalMeasurementModalComponent } from '../../components/clinical-measurement-modal/clinical-measurement-modal.component';
import { AvailabilityService } from '../../services/availability.service';
import { ConsultationTypeService } from '../../services/consultation-type.service';
import { ConsultationType } from '../../models/consultation-type.model';
import { CreateAppointmentRequest } from '../../models/appointment-request';
import { ClinicalMeasurementResponse } from '../../models/clinical-measurement.model';
import { ClinicalMeasurementService } from '../../services/clinical-measurement.service';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';

@Component({
  selector: 'app-caregiver-appointments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ClinicalMeasurementModalComponent],
  templateUrl: './caregiver-appointments-page.component.html',
  styleUrls: ['./caregiver-appointments-page.component.css']
})
export class CaregiverAppointmentsPageComponent implements OnInit {
  currentCaregiver: User | null = null;
  patients: User[] = [];
  patient: User | null = null;
  appointments: Appointment[] = [];
  selectedAppointment: Appointment | null = null;
  doctors: User[] = [];
  consultationTypes: ConsultationType[] = [];
  availableSlots: string[] = [];
  clinicalMeasurements: ClinicalMeasurementResponse[] = [];
  measurementsByAppointment: Record<string, ClinicalMeasurementResponse[]> = {};

  loading = false;
  bookingLoading = false;
  errorMessage = '';
  successMessage = '';
  showDetailsModal = false;
  showClinicalMeasurementModal = false;
  clinicalMeasurementAppointment: Appointment | null = null;
  today = new Date().toISOString().split('T')[0];
  bookingForm = {
    doctorId: '',
    consultationTypeId: '',
    date: '',
    time: '',
    caregiverPresence: 'REMOTE',
    notes: ''
  };

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private patientCaregiverService: CaregiverPatientService,
    private availabilityService: AvailabilityService,
    private consultationTypeService: ConsultationTypeService,
    private clinicalMeasurementService: ClinicalMeasurementService,
    private feedback: AppFeedbackService
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
          console.log('<svg class="inline-svg-icon text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg> Caregiver loaded:', this.currentCaregiver);
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
        console.error('Error loading caregiver:', error);
        this.showAppointmentPopup('error', 'Failed to load user information');
        this.loading = false;
      }
    });
  }

  /**
   * Load the patient assigned to this caregiver using the relation service
   */
  loadPatientForCaregiver(): void {
    if (!this.currentCaregiver?.userId) {
      this.showAppointmentPopup('error', 'Caregiver ID not found');
      this.loading = false;
      return;
    }

    console.log('Loading patient for caregiver ID:', this.currentCaregiver.userId);

    this.patientCaregiverService.getPatientsByCaregiverId(this.currentCaregiver.userId)
      .subscribe({
        next: (patients) => {
        console.log('Patients received:', patients);

          if (patients && patients.length > 0) {
            this.patients = patients;
            this.patient = patients[0];
            console.log('<svg class="inline-svg-icon text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg> Patient assigned:', this.patient);

            if (this.patient.userId) {
              this.loadBookingData();
              this.loadAppointments(this.patient.userId);
            } else {
              this.showAppointmentPopup('error', 'Patient ID not found');
              this.loading = false;
            }
          } else {
            console.log('<svg class="inline-svg-icon text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" stroke-width="2"></path><path d="M12 9v4M12 17h.01" stroke-width="2" stroke-linecap="round"></path></svg> No patients found for this caregiver');
            this.showAppointmentPopup('warning', 'No patient assigned to you');
            this.loading = false;
          }
        },
        error: (error) => {
        console.error('Error loading patients:', error);

          // Handle specific error cases
          if (error.status === 401) {
            this.toastr.error('Session expired. Please login again.');
            this.router.navigate(['/login']);
          } else if (error.status === 403) {
            this.toastr.error('You do not have permission to access this resource.');
          } else if (error.status === 404) {
            this.showAppointmentPopup('error', 'Patient endpoint not found');
          } else if (error.status === 0) {
            this.showAppointmentPopup('error', 'Cannot connect to server. Please check if backend is running.');
          } else {
            this.showAppointmentPopup('error', 'Failed to load patient information');
          }
          this.loading = false;
        }
      });
  }

  /**
   * Load appointments for a patient
   */
  loadAppointments(patientId: string): void {
    console.log('<svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M7 3v4M17 3v4M4 9h16M5 5h14v16H5z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg> Loading appointments for patient:', patientId);

    this.appointmentService.getAppointmentsByPatient(patientId).subscribe({
      next: (data) => {
        this.appointments = this.normalizeAppointments(data);
        console.log('<svg class="inline-svg-icon text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg> Appointments loaded:', this.appointments.length);
        this.loadClinicalMeasurements(patientId);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading appointments:', error);
        this.showAppointmentPopup('error', 'Failed to load appointments');
        this.loading = false;
      }
    });
  }

  onPatientSelected(patientId: string): void {
    const selected = this.patients.find(p => p.userId === patientId);
    if (!selected?.userId) {
      return;
    }

    this.patient = selected;
    this.appointments = [];
    this.clinicalMeasurements = [];
    this.measurementsByAppointment = {};
    this.resetBookingForm();
    this.loadBookingData();
    this.loadAppointments(selected.userId);
  }

  loadBookingData(): void {
    this.loadConsultationTypes();
    this.loadDoctors();
  }

  loadConsultationTypes(): void {
    this.consultationTypeService.getAllConsultationTypes().subscribe({
      next: (types) => {
        this.consultationTypes = (types || []).filter(type => type.active !== false);
      },
      error: (error) => {
        console.error('Error loading consultation types:', error);
        this.consultationTypes = [];
      }
    });
  }

  loadDoctors(): void {
    this.authService.searchUsersByRole('', 'DOCTOR').subscribe({
      next: (doctors) => {
        const doctorKeys = this.associatedDoctorKeys(this.patient);
        this.doctors = doctorKeys.length
          ? (doctors || []).filter(doctor =>
              doctorKeys.includes(String(doctor.email || '').trim().toLowerCase()) ||
              doctorKeys.includes(String(doctor.userId || '').trim().toLowerCase())
            )
          : (doctors || []);

        if (this.doctors.length === 1) {
          this.bookingForm.doctorId = this.doctors[0].userId || '';
          this.loadAvailableSlots();
        }
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
        this.doctors = [];
      }
    });
  }

  loadAvailableSlots(): void {
    if (!this.bookingForm.doctorId || !this.bookingForm.date) {
      this.availableSlots = [];
      return;
    }

    this.bookingLoading = true;
    this.availabilityService.getAvailableTimeSlots(
      this.bookingForm.doctorId,
      new Date(`${this.bookingForm.date}T00:00:00`),
      this.getSelectedConsultationDuration()
    ).subscribe({
      next: (slots) => {
        this.availableSlots = slots || [];
        if (!this.availableSlots.includes(this.bookingForm.time)) {
          this.bookingForm.time = '';
        }
        this.bookingLoading = false;
      },
      error: (error) => {
        console.error('Error loading available slots:', error);
        this.availableSlots = [];
        this.bookingLoading = false;
      }
    });
  }

  bookAppointmentForPatient(): void {
    if (!this.patient?.userId || !this.currentCaregiver?.userId) {
      this.showAppointmentPopup('error', 'Missing caregiver or patient information');
      return;
    }

    if (!this.bookingForm.doctorId || !this.bookingForm.consultationTypeId || !this.bookingForm.date || !this.bookingForm.time) {
      this.showAppointmentPopup('warning', 'Please select a doctor, type, date, and time.');
      return;
    }

    const selectedType = this.consultationTypes.find(type => type.typeId === this.bookingForm.consultationTypeId);
    const startDateTime = new Date(`${this.bookingForm.date}T${this.bookingForm.time}`);
    const endDateTime = new Date(startDateTime.getTime() + this.getSelectedConsultationDuration() * 60000);

    const payload: CreateAppointmentRequest = {
      patientId: this.patient.userId,
      doctorId: this.bookingForm.doctorId,
      caregiverId: this.currentCaregiver.userId,
      consultationTypeId: this.bookingForm.consultationTypeId,
      consultationTypeName: selectedType?.name,
      startDateTime: this.toLocalDateTimeString(startDateTime),
      endDateTime: this.toLocalDateTimeString(endDateTime),
      status: 'SCHEDULED',
      caregiverPresence: this.bookingForm.caregiverPresence,
      simpleSummary: this.bookingForm.notes || undefined
    };

    this.bookingLoading = true;
    this.appointmentService.createAppointment(payload).subscribe({
      next: (created) => {
        this.appointments = [
          ...this.appointments,
          ...this.normalizeAppointments([created])
        ].sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
        this.resetBookingForm();
        this.showAppointmentPopup('success', 'Appointment booked for the patient successfully.');
        setTimeout(() => this.successMessage = '', 3000);
        this.bookingLoading = false;
      },
      error: (error) => {
        console.error('Error booking appointment:', error);
        this.showAppointmentPopup('error', error?.error?.message || 'Failed to book appointment');
        this.bookingLoading = false;
      }
    });
  }

  loadClinicalMeasurements(patientId: string): void {
    this.clinicalMeasurementService.getByPatient(patientId).subscribe({
      next: (measurements) => {
        this.clinicalMeasurements = measurements || [];
        this.measurementsByAppointment = this.clinicalMeasurements.reduce((acc, measurement) => {
          const key = measurement.appointmentId || 'unlinked';
          acc[key] = [...(acc[key] || []), measurement];
          return acc;
        }, {} as Record<string, ClinicalMeasurementResponse[]>);
      },
      error: (error) => {
        console.error('Error loading clinical measurements:', error);
        this.clinicalMeasurements = [];
        this.measurementsByAppointment = {};
      }
    });
  }

  getMeasurementsForAppointment(appointment: Appointment): ClinicalMeasurementResponse[] {
    return this.measurementsByAppointment[appointment.appointmentId] || [];
  }

  getLatestMeasurementForAppointment(appointment: Appointment): ClinicalMeasurementResponse | null {
    return this.getMeasurementsForAppointment(appointment)[0] || null;
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

  openAppointmentDetails(appointment: Appointment): void {
    this.viewAppointmentDetails(appointment);
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
        this.showAppointmentPopup('success', 'Appointment confirmed successfully');
      },
      error: (error) => {
        console.error('Error confirming appointment:', error);
        this.showAppointmentPopup('error', 'Failed to confirm appointment');
        this.loading = false;
      }
    });
  }

  /**
   * Join a video call
   */
  joinVideoCall(appointment: Appointment | string | undefined): void {
    const appointmentId = typeof appointment === 'string'
      ? this.appointments.find(apt => apt.videoLink === appointment)?.appointmentId
      : appointment?.appointmentId;

    if (appointmentId) {
      this.router.navigate(['/appointments/video', appointmentId]);
    } else {
      this.showAppointmentPopup('warning', 'No video consultation room available for this appointment');
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

  /**
   * Check if appointment is tomorrow (for showing submit clinical data button)
   */
  isTomorrow(appointment: Appointment): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const aptDate = new Date(appointment.startDateTime);
    return aptDate.toDateString() === tomorrow.toDateString();
  }

  /**
   * Check if appointment is upcoming (for showing submit clinical data button)
   */
  isUpcoming(appointment: Appointment): boolean {
    const now = new Date();
    const aptDate = new Date(appointment.startDateTime);
    return aptDate > now && appointment.status !== 'CANCELLED';
  }

  /**
   * Open clinical measurement modal
   */
  openClinicalMeasurementModal(appointment: Appointment): void {
    this.clinicalMeasurementAppointment = appointment;
    this.showClinicalMeasurementModal = true;
  }

  /**
   * Close clinical measurement modal
   */
  closeClinicalMeasurementModal(): void {
    this.showClinicalMeasurementModal = false;
    this.clinicalMeasurementAppointment = null;
  }

  /**
   * Handle clinical measurement submitted
   */
  onClinicalMeasurementSubmitted(): void {
    this.closeClinicalMeasurementModal();
    if (this.patient?.userId) {
      this.loadClinicalMeasurements(this.patient.userId);
    }
    this.showAppointmentPopup('success', 'Clinical measurements submitted successfully!');
    setTimeout(() => this.successMessage = '', 3000);
  }

  private normalizeAppointments(data: Appointment[]): Appointment[] {
    return (data || []).map(item => ({
      ...item,
      startDateTime: new Date(item.startDateTime),
      endDateTime: new Date(item.endDateTime),
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      confirmationDatePatient: item.confirmationDatePatient ? new Date(item.confirmationDatePatient) : undefined,
      confirmationDateCaregiver: item.confirmationDateCaregiver ? new Date(item.confirmationDateCaregiver) : undefined
    }));
  }

  private getSelectedConsultationDuration(): number {
    const selectedType = this.consultationTypes.find(type => type.typeId === this.bookingForm.consultationTypeId);
    return selectedType?.alzheimerDuration || selectedType?.defaultDuration || 20;
  }

  private resetBookingForm(): void {
    this.bookingForm = {
      doctorId: this.doctors.length === 1 ? this.doctors[0].userId || '' : '',
      consultationTypeId: '',
      date: '',
      time: '',
      caregiverPresence: 'REMOTE',
      notes: ''
    };
    this.availableSlots = [];
  }

  private associatedDoctorKeys(patient: User | null): string[] {
    if (!patient) return [];
    return [
      patient.doctorEmail,
      ...(Array.isArray(patient.doctorEmails) ? patient.doctorEmails : [])
    ]
      .map(value => String(value || '').trim().toLowerCase())
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index);
  }

  private toLocalDateTimeString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  private showAppointmentPopup(type: 'success' | 'error' | 'info' | 'warning', message: string): void {
    this.errorMessage = type === 'error' || type === 'warning' ? message : '';
    this.successMessage = type === 'success' ? message : '';
    this.feedback.show(type, 'Appointments', message);
  }
}
