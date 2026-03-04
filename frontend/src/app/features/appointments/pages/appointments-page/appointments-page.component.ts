import { Component, OnInit } from '@angular/core';
import { Appointment } from '../../models/appointment';
import { User } from '../../models/user';
import { ConsultationType } from '../../models/consultation-type.model';
import { AppointmentService } from '../../services/appointments.service';
import { CreateAppointmentRequest } from '../../models/appointment-request';
import { AvailabilityService } from '../../services/availability.service';
import { AuthService } from '../../../front-office/pages/login/auth.service';
import { ConsultationTypeService } from '../../services/consultation-type.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-appointments-page',
  templateUrl: './appointments-page.component.html',
})
export class AppointmentsPageComponent implements OnInit {
  // ========== EXISTING PROPERTIES ==========

  currentPatient: User = {
    userId: "",
    name: "",
    email: "",
    role: "PATIENT",
    phone: "",
    profilePicture: "",
  };

  currentDate: Date = new Date();
  isAddDialogOpen = false;
  selectedAppointment: Appointment | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Data
  doctors: User[] = [];
  myCaregivers: User[] = [];
  consultationTypes: ConsultationType[] = [];
  appointments: Appointment[] = [];

  // Filters
  filters = { status: '', doctorId: '' };

  // New appointment form
  newAppointment: any = {
    doctorId: '',
    consultationTypeId: '',
    date: '',
    time: '',
    caregiverId: '',
    caregiverPresence: 'NONE',
    notes: ''
  };

  availableSlots: string[] = [];

  // ========== NEW PROPERTIES FOR BOOKING TAB ==========

  activeTab: 'my-appointments' | 'book-appointment' = 'my-appointments';
  bookingStep: 1 | 2 | 3 = 1;
  selectedDoctorId: string | null = null;
  selectedSlot: any = null;

  constructor(
    private appointmentService: AppointmentService,
    private availabilityService: AvailabilityService,
    private consultationTypeService: ConsultationTypeService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  // ========== INITIALIZATION ==========

  ngOnInit(): void {
    this.loadCurrentPatient();
  }

  loadCurrentPatient(): void {
    this.loading = true;

    // Get current user from auth service
    this.authService.currentUser$.subscribe({
      next: (user) => {
        if (user && user.role === 'PATIENT') {
          this.currentPatient = {
            ...user,
            userId: user.userId || '',
            name: user.name || '',
            email: user.email || '',
            role: 'PATIENT',
            phone: user.phone || '',
            profilePicture: user.profilePicture || '',
          };
          this.loadInitialData();
        } else if (user && user.role !== 'PATIENT') {
          this.toastr.error('Access denied. This page is for patients only.');
          this.router.navigate(['/']);
        } else {

          this.router.navigate(['/login']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading current user:', error);
        this.toastr.error('Failed to load user information');
        this.router.navigate(['/login']);
        this.loading = false;
      }
    });
  }

  loadInitialData(): void {
    this.loading = true;
    this.errorMessage = '';

    // Load all necessary data in parallel
    Promise.all([
      this.loadDoctorsPromise(),
      this.loadCaregiversPromise(),
      this.loadConsultationTypesPromise(),
      this.loadAppointmentsPromise()
    ]).then(() => {
      this.loading = false;
    }).catch((error) => {
      console.error('Error loading initial data:', error);
      this.errorMessage = 'Failed to load some data. Please refresh the page.';
      this.loading = false;
      setTimeout(() => this.errorMessage = '', 3000);
    });
  }

  loadAppointmentsPromise(): Promise<void> {
    if (!this.currentPatient.userId) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.appointmentService.getAppointmentsByPatient(this.currentPatient.userId || "").subscribe({
        next: (data) => {
          this.appointments = data;

          resolve();
        },
        error: (error) => {
          console.error('Error loading appointments:', error);
          this.errorMessage = 'Failed to load appointments.';
          resolve(); // Resolve anyway to continue loading other data
        }
      });
    });
  }

  // ========== REAL DATA LOADING METHODS ==========
  private loadDoctorsPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.authService.searchUsersByRole('', 'DOCTOR').subscribe({
        next: (doctors) => {
          this.doctors = doctors;
          resolve();
        },
        error: (error) => {
          console.error('Error loading doctors:', error);

          resolve();
        }
      });
    });
  }
  private loadCaregiversPromise(): Promise<void> {
    if (!this.currentPatient.userId) {
      this.loadMockCaregivers();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.authService.searchUsersByRole('', 'CAREGIVER').subscribe({
        next: (caregivers) => {
          this.myCaregivers = caregivers.filter(c =>
            (c as any).patientEmails?.includes(this.currentPatient.email)
          );
          if (this.myCaregivers.length === 0) {
            this.loadMockCaregivers();
          }
          resolve();
        },
        error: (error) => {
          console.error('Error loading caregivers:', error);
          this.loadMockCaregivers();
          resolve();
        }
      });
    });
  }
  private loadConsultationTypesPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.consultationTypeService.getAllConsultationTypes().subscribe({
        next: (types) => {
          this.consultationTypes = types;
          resolve();
        },
        error: (error) => {
          console.error('Error loading consultation types:', error);

          resolve();
        }
      });
    });
  }

  // ========== MOCK DATA FALLBACKS (for development) ==========



  private loadMockCaregivers(): void {
    this.myCaregivers = [
      {
        userId: "care-001",
        name: "Sophie Moreau",
        email: "sophie.moreau@email.com",
        role: "CAREGIVER",
        phone: "06 78 90 12 34",
        profilePicture: "https://randomuser.me/api/portraits/women/10.jpg",
        emergencyContact: "Jeanne Moreau"
      }
    ];
  }



  // ========== EXISTING GETTERS ==========


  get filteredAppointments(): Appointment[] {
   return this.appointments;

  }

  get upcomingAppointments(): Appointment[] {
    const now = new Date();
    return this.filteredAppointments
      .filter(apt =>
        (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED_BY_PATIENT' || apt.status === 'CONFIRMED_BY_CAREGIVER') &&
        new Date(apt.startDateTime) > now
      )
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  }
get MyAppointments(): Appointment[] {
    return this.appointments;
}
  get pastAppointments(): Appointment[] {
    const now = new Date();
    return this.filteredAppointments
      .filter(apt => new Date(apt.startDateTime) < now || apt.status === 'COMPLETED' || apt.status === 'CANCELLED')
      .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
  }

  // ========== EXISTING EVENT HANDLERS ==========

  onFiltersChanged(filters: { status: string; doctorId: string }): void {
    this.filters = filters;
  }

  onMonthChanged(newDate: Date): void {
    this.currentDate = newDate;
  }

  onDateSelected(date: string): void {
    console.log('Date selected:', date);
    setTimeout(() => {
      const element = document.getElementById('appointments-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  // ========== EXISTING APPOINTMENT ACTIONS ==========

  viewAppointmentDetails(appointment: Appointment): void {
    this.selectedAppointment = appointment;
  }

  closeDetailsDialog(): void {
    this.selectedAppointment = null;
  }

  handleAppointmentAction(appointment: Appointment): void {
    if (appointment.status === 'SCHEDULED') {
      this.confirmAppointment(appointment.appointmentId);
    } else if (appointment.videoLink && this.canJoinCall(appointment)) {
      this.joinVideoCall(appointment.videoLink);
    }
  }

  confirmAppointment(appointmentId: string): void {
    this.loading = true;
    this.appointmentService.confirmByPatient(appointmentId).subscribe({
      next: (updatedAppointment) => {
        const index = this.appointments.findIndex(a => a.appointmentId === appointmentId);
        if (index !== -1) {
          this.appointments[index] = updatedAppointment;
        }
        this.loading = false;
        this.toastr.success('Appointment confirmed successfully');
      },
      error: (error) => {
        console.error('Error confirming appointment:', error);
        this.toastr.error('Failed to confirm appointment. Please try again.');
        this.loading = false;
      }
    });
  }

  cancelAppointment(appointmentId: string): void {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      this.loading = true;
      this.appointmentService.cancelAppointment(appointmentId).subscribe({
        next: (updatedAppointment) => {
          const index = this.appointments.findIndex(a => a.appointmentId === appointmentId);
          if (index !== -1) {
            this.appointments[index] = updatedAppointment;
          }
          this.closeDetailsDialog();
          this.loading = false;
          this.toastr.success('Appointment cancelled successfully');
        },
        error: (error) => {
          console.error('Error cancelling appointment:', error);
          this.toastr.error('Failed to cancel appointment. Please try again.');
          this.loading = false;
        }
      });
    }
  }

  joinVideoCall(videoLink: string | undefined): void {
    if (videoLink) {
      window.open(videoLink, '_blank');
    }
  }

  canJoinCall(appointment: Appointment): boolean {
    const now = new Date();
    const appointmentTime = new Date(appointment.startDateTime);
    const diffMinutes = (appointmentTime.getTime() - now.getTime()) / 60000;

    return (appointment.status === 'CONFIRMED_BY_PATIENT' ||
        appointment.status === 'CONFIRMED_BY_CAREGIVER') &&
      diffMinutes <= 15 && diffMinutes >= -30;
  }

  // ========== EXISTING ADD APPOINTMENT METHODS ==========

  openAddDialog(): void {
    this.isAddDialogOpen = true;
    this.resetNewAppointment();
  }

  closeAddDialog(): void {
    this.isAddDialogOpen = false;
    this.resetNewAppointment();
  }

  resetNewAppointment(): void {
    this.newAppointment = {
      doctorId: '',
      consultationTypeId: '',
      date: '',
      time: '',
      caregiverId: '',
      caregiverPresence: 'NONE',
      notes: ''
    };
    this.availableSlots = [];
  }

  /**
   * Load available time slots for a specific doctor and date
   * Uses the backend API endpoint: GET /availabilities/available-slots
   */
  loadAvailableSlots(doctorId: string, date: string): void {
    if (!doctorId || !date) {
      this.availableSlots = [];
      return;
    }

    const selectedDate = new Date(date);

    // Get the selected consultation type duration (if available)
    const selectedType = this.consultationTypes.find(
      t => t.typeId === this.newAppointment.consultationTypeId
    );
    const durationMinutes = 20;

    this.loading = true;

    // Use the availability service to get available slots
    this.availabilityService.getAvailableTimeSlots(doctorId, selectedDate, durationMinutes).subscribe({
      next: (slots: string[]) => {
        this.availableSlots = slots;
        this.loading = false;

        if (slots.length === 0) {
          this.toastr.info('No available slots for this date');
        }
      },
      error: (error) => {
        console.error('Error loading available slots:', error);
        this.loadMockAvailableSlots(doctorId);
        this.loading = false;
      }
    });
  }

  /**
   * Fallback method to load mock available slots when API fails
   */
  private loadMockAvailableSlots(doctorId: string): void {
    const slotsByDoctor: { [key: string]: string[] } = {
      'doc-001': ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'],
      'doc-002': ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
      'doc-003': ['09:30', '10:30', '14:00', '15:00'],
    };

    this.availableSlots = slotsByDoctor[doctorId] ||
      ['09:00', '10:00', '11:00', '14:00', '15:00'];

    console.log('Using mock slots:', this.availableSlots);
  }

  /**
   * Update the method to be called when doctor or date changes
   */
  onDoctorOrDateChange(): void {
    if (this.newAppointment.doctorId && this.newAppointment.date) {
      this.loadAvailableSlots(
        this.newAppointment.doctorId,
        this.newAppointment.date
      );
    } else {
      this.availableSlots = [];
    }
  }

  addAppointment(formData: any): void {
    if (!this.isFormValid()) {
      this.toastr.warning('Please fill in all required fields');
      return;
    }

    const selectedDoctor = this.doctors.find(d => d.userId === formData.doctorId);
    const selectedType = this.consultationTypes.find(t => t.typeId === formData.consultationTypeId);
    const selectedCaregiver = this.myCaregivers.find(c => c.userId === formData.caregiverId);

    if (!selectedDoctor || !selectedType) {
      this.toastr.error('Please select a valid doctor and consultation type');
      return;
    }

    const startDateTime = new Date(formData.date + 'T' + formData.time);
    const endDateTime = new Date(startDateTime.getTime() );

    const newAppointmentPayload: CreateAppointmentRequest = {
      patientId: this.currentPatient.userId!,
      patientName: this.currentPatient.name,
      doctorId: formData.doctorId,
      doctorName: selectedDoctor?.name || '',
      caregiverId: formData.caregiverId || undefined,
      caregiverName: selectedCaregiver?.name,
      consultationTypeId: formData.consultationTypeId,
      consultationTypeName: selectedType?.name || '',
      startDateTime: startDateTime,
      endDateTime: endDateTime,
      status: 'SCHEDULED',
      caregiverPresence: formData.caregiverPresence,
      videoLink: `https://consult.evercare.com/room/${formData.doctorId}-${this.currentPatient.userId}`,
      doctorNotes: formData.notes,
      isRecurring: false
    };

    this.loading = true;
    this.appointmentService.createAppointment(newAppointmentPayload).subscribe({
      next: (createdAppointment) => {
        this.appointments.push(createdAppointment);
        this.closeAddDialog();
        this.loading = false;
        this.toastr.success('Appointment created successfully');
      },
      error: (error) => {
        console.error('Error creating appointment:', error);
        if (error.status === 0) {
          this.toastr.error('Cannot connect to server. Please check if backend is running.');
        } else if (error.status === 404) {
          this.toastr.error('API endpoint not found. Please check the URL.');
        } else if (error.status === 500) {
          this.toastr.error('Server error. Please try again later.');
        } else {
          this.toastr.error('Failed to create appointment. Please try again.');
        }
        this.loading = false;
      }
    });
  }

  isFormValid(): boolean {
    return !!(
      this.newAppointment.doctorId &&
      this.newAppointment.consultationTypeId &&
      this.newAppointment.date &&
      this.newAppointment.time
    );
  }

  // ========== UTILITY METHODS ==========

  getDuration(appointment: Appointment): number {
    const diff = new Date(appointment.endDateTime).getTime() - new Date(appointment.startDateTime).getTime();
    return Math.round(diff / 60000);
  }

  refreshAppointments(): void {
    this.loadAppointmentsPromise().then(() => {
      this.toastr.success('Appointments refreshed');
    });
  }

  // ========== NEW METHODS FOR BOOKING TAB ==========

  onDoctorSelected(doctorId: string): void {
    this.selectedDoctorId = doctorId;
    this.bookingStep = 2;
    this.newAppointment.doctorId = doctorId;
  }

  onSlotSelected(slot: any): void {
    this.selectedSlot = slot;
    this.newAppointment.date = this.formatDate(slot.date);
    this.newAppointment.time = slot.startTime;
  }

  getSelectedDoctor(): User {
    if (!this.selectedDoctorId) {
      return {
        userId: '',
        name: '',
        email: '',
        role: 'DOCTOR',
        phone: '',
        profilePicture: ''
      };
    }
    const doctor = this.doctors.find(d => d.userId === this.selectedDoctorId);
    return doctor || {
      userId: '',
      name: '',
      email: '',
      role: 'DOCTOR',
      phone: '',
      profilePicture: ''
    };
  }

  bookAppointment(formData: any): void {
    this.addAppointment(formData);
    this.activeTab = 'my-appointments';
    this.bookingStep = 1;
    this.selectedDoctorId = null;
    this.selectedSlot = null;
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
