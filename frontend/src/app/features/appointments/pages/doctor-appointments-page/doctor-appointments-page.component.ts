import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../models/appointment';
import { User } from '../../models/user';
import { DoctorStats } from '../../models/doctor-stats';
import { RecentPatient } from '../../models/recent-patient';
import { AppointmentService } from '../../services/appointments.service';
import { AuthService } from '../../../front-office/pages/login/auth.service';
import { AvailabilityService } from '../../services/availability.service';
import { ConsultationTypeService } from '../../services/consultation-type.service';
import { Availability, AvailabilityStats } from '../../models/availability.model';
import { ConsultationType } from '../../models/consultation-type.model';
import { Router } from '@angular/router';
@Component({
  selector: 'app-doctor-appointments-page',
  templateUrl: './doctor-appointments-page.component.html',
})
export class DoctorAppointmentsPageComponent implements OnInit {

  // Current doctor (from auth service)
  currentDoctor: User = {
    userId: '',
    name: '',
    email: '',
    role: 'DOCTOR',
    phone: '',
    profilePicture: '',
  };

  // Appointments data
  appointments: Appointment[] = [];
  selectedAppointment: Appointment | null = null;

  // Stats
  doctorStats: DoctorStats = {
    todayCount: 0,
    upcomingCount: 0,
    totalPatients: 0,
    completionRate: 0
  };

  // Recent patients
  recentPatients: RecentPatient[] = [];

  // Selected patient details
  selectedPatientBirthDate?: Date;
  selectedPatientAge?: number;
  selectedPatientStage?: string;
  selectedPatientEmergency?: string;
  selectedPatientVisits?: number;

  // Loading states
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Date filter
  selectedDate: Date = new Date();

  // Notes editing state
  isEditingNotes = false;

  // ========== NEW PROPERTIES ==========
  activeTab: 'dashboard' | 'availability' | 'consultation-types' = 'dashboard';

  // Availability
  availabilities: Availability[] = [];

  availabilityStats: AvailabilityStats = {
    weeklyHours: 0,
    availableSlots: 0,
    bookedThisWeek: 0,
  };
  showExceptionForm: boolean = false;


  // New exception form
  newConsultationType: any = {
    name: '',
    description: '',
    defaultDuration: 20,
    alzheimerDuration: 25,
    requiresCaregiver: false,
    environmentPreset: 'STANDARD',
    active: true
  };
  editingTypeId?: string;


  // Consultation Types
  consultationTypesList: ConsultationType[] = [];

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private availabilityService: AvailabilityService,
    private consultationTypeService: ConsultationTypeService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    // Get current user from auth service
    this.authService.currentUser$.subscribe(user => {
      if (user && user.role === 'DOCTOR') {
        this.currentDoctor = {
          ...this.currentDoctor,
          ...user,
          userId: user.userId || '',
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          profilePicture: user.profilePicture || '',
          role: 'DOCTOR'
        };
        this.loadAllData();
      }
    });
  }

  loadAllData(): void {
    this.loadAppointments();
    this.loadAvailabilities();
    this.loadConsultationTypes();
  }

  loadAppointments(): void {
    if (!this.currentDoctor.userId) {
      this.appointments = [];
      return;
    }

    this.loading = true;
    this.appointmentService.getAppointmentsByDoctor(this.currentDoctor.userId).subscribe({
      next: (data: any) => {
        console.log('Raw appointments data:', data);
        this.appointments = this.transformAppointments(data);

        this.calculateStats();
        this.loadRecentPatients();
        this.updateAvailabilityStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading appointments:', error);
        this.errorMessage = 'Failed to load appointments';
        this.loading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  private transformAppointments(data: any[]): Appointment[] {
    return data.map(item => ({
      appointmentId: item.appointmentId,
      // Fix: handle both nested object and flat structure
      patientId: item.patient?.userId || item.patientId || '',
      patientName: item.patient?.name || item.patientName || '',
      doctorId: item.doctor?.userId || item.doctorId || '',
      doctorName: item.doctor?.name || item.doctorName || '',
      caregiverId: item.caregiver?.userId || item.caregiverId,
      caregiverName: item.caregiver?.name || item.caregiverName,
      consultationTypeId: item.consultationType?.typeId || item.consultationTypeId || '',
      consultationTypeName: item.consultationType?.name || item.consultationTypeName || '',
      startDateTime: new Date(item.startDateTime),  // ← convert to Date
      endDateTime: new Date(item.endDateTime),       // ← convert to Date
      status: item.status,
      caregiverPresence: item.caregiverPresence,
      videoLink: item.videoLink,
      doctorNotes: item.doctorNotes,
      isRecurring: item.isRecurring || false,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    }));
  }

  loadRecentPatients(): void {
    // Get unique patients from appointments
    const patientMap = new Map();

    this.appointments.forEach(apt => {
      if (!patientMap.has(apt.patientId)) {
        patientMap.set(apt.patientId, {
          id: apt.patientId,
          name: apt.patientName,
          photo: '', // You would need to get this from somewhere
          lastVisit: this.getMostRecentAppointmentDate(apt.patientId),
          nextVisit: this.getNextAppointmentDate(apt.patientId),
          alzheimerStage: 'MODERE' // You would need to get this from patient data
        });
      }
    });

    this.recentPatients = Array.from(patientMap.values())
      .sort((a, b) => (b.lastVisit?.getTime() || 0) - (a.lastVisit?.getTime() || 0))
      .slice(0, 5);
  }

  private getMostRecentAppointmentDate(patientId: string): Date | null {
    const patientAppointments = this.appointments
      .filter(apt => apt.patientId === patientId)
      .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());

    return patientAppointments.length > 0 ? new Date(patientAppointments[0].startDateTime) : null;
  }

  private getNextAppointmentDate(patientId: string): Date | null {
    const now = new Date();
    const futureAppointments = this.appointments
      .filter(apt => apt.patientId === patientId && new Date(apt.startDateTime) > now)
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

    return futureAppointments.length > 0 ? new Date(futureAppointments[0].startDateTime) : null;
  }

  calculateStats(): void {
    this.doctorStats = {
      todayCount: this.todayAppointments.length,
      upcomingCount: this.upcomingAppointments.length,
      totalPatients: new Set(this.appointments.map(apt => apt.patientId)).size,
      completionRate: this.getCompletionRate()
    };
  }

  private getCompletionRate(): number {
    const completed = this.appointments.filter(apt => apt.status === 'COMPLETED').length;
    const total = this.appointments.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  // ========== TAB METHODS ==========

  onTabChange(tab: 'dashboard' | 'availability' | 'consultation-types'): void {
    this.activeTab = tab;
  }

  // ========== AVAILABILITY METHODS ==========

  loadAvailabilities(): void {
    if (!this.currentDoctor.userId) {
      this.availabilities = [];
      this.updateAvailabilityStats();
      return;
    }

    this.availabilityService.getAvailabilitiesByDoctor(this.currentDoctor.userId).subscribe({
      next: (data) => {
        this.availabilities = data.map(slot => ({
          ...slot,
          day: this.getDayName(slot.dayOfWeek)
        }));
        this.updateAvailabilityStats();
      },
      error: (error) => {
        console.error('Error loading availabilities:', error);
      }
    });


  }



  updateAvailabilityStats(): void {
    // Calculate weekly hours
    const weeklyHours = this.availabilities.reduce((total, slot) => {
      const start = this.timeToMinutes(slot.startTime);
      const end = this.timeToMinutes(slot.endTime);
      return total + (end - start) / 60;
    }, 0);

    // Calculate available slots per week
    const availableSlots = this.availabilities.reduce((total, slot) => {
      const start = this.timeToMinutes(slot.startTime);
      const end = this.timeToMinutes(slot.endTime);
      const slotCount = Math.floor((end - start) / (slot.slotDuration || 20));
      return total + slotCount;
    }, 0);

    // Calculate booked slots this week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const bookedThisWeek = this.appointments.filter(apt => {
      const aptDate = new Date(apt.startDateTime);
      return aptDate >= weekStart && aptDate < weekEnd;
    }).length;

    // Get next exception

    this.availabilityStats = {
      weeklyHours,
      availableSlots,
      bookedThisWeek,
    };
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  getDayName(dayCode: string): string {
    const days: Record<string, string> = {
      'MONDAY': 'Monday',
      'TUESDAY': 'Tuesday',
      'WEDNESDAY': 'Wednesday',
      'THURSDAY': 'Thursday',
      'FRIDAY': 'Friday',
      'SATURDAY': 'Saturday',
      'SUNDAY': 'Sunday'
    };
    return days[dayCode] || dayCode;
  }

  // In doctor-appointments-page.component.ts
  addAvailability(slotData: any): void {
    // The payload should have doctor as object with userId
    const availabilityPayload = {
      doctor: { userId: this.currentDoctor.userId }, // This is what backend expects
      dayOfWeek: slotData.dayOfWeek || slotData.dayCode,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
      slotDuration: slotData.slotDuration,
      validFrom: slotData.validFrom,
      validTo: slotData.validTo,
      recurrence: slotData.recurrence,
      isBlocked: false,
      blockReason: null
    };

    console.log('Sending availability payload:', availabilityPayload);

    this.availabilityService.createAvailability(availabilityPayload).subscribe({
      next: (newSlot) => {
        this.availabilities.push({
          ...newSlot,
          day: this.getDayName(newSlot.dayOfWeek)
        });
        this.updateAvailabilityStats();
        this.successMessage = 'Availability added successfully';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error adding availability:', error);
        this.errorMessage = 'Failed to add availability. Please check the data and try again.';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  editAvailability(slot: Availability): void {
    // Implement edit functionality
    console.log('Edit availability:', slot);
    this.successMessage = 'Edit functionality coming soon';
    setTimeout(() => this.successMessage = '', 3000);
  }

  deleteAvailability(id: string | undefined): void {
    if (!id) return;

    this.availabilityService.deleteAvailability(id).subscribe({
      next: () => {
        this.availabilities = this.availabilities.filter(a => a.availabilityId !== id);
        this.updateAvailabilityStats();
        this.successMessage = 'Availability deleted successfully';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error deleting availability:', error);
        this.errorMessage = 'Failed to delete availability';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }




  // ========== CONSULTATION TYPES METHODS ==========

  loadConsultationTypes(): void {
    this.consultationTypeService.getAllConsultationTypes().subscribe({
      next: (data) => {
        this.consultationTypesList = data;
        console.log(this.consultationTypesList);
      },
      error: (error) => {
        console.error('Error loading consultation types:', error);

      }
    });
  }



  addConsultationType($event: any): void {

    if (!$event.name || !$event.defaultDuration) {
      this.errorMessage = 'Please fill in all required fields';
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    const payload = {
      name: $event.name,
      description: $event.description,
      defaultDurationMinutes: $event.defaultDuration,
      alzheimerDurationMinutes: $event.alzheimerDuration || Math.round($event.defaultDuration * 1.25),
      requiresCaregiver: $event.requiresCaregiver,
      environmentPreset: $event.environmentPreset,
      active: $event.active
    };

    this.consultationTypeService.createConsultationType(payload).subscribe({
      next: (newType) => {
        this.consultationTypesList.push(newType);
        this.successMessage = 'Consultation type added successfully';
        setTimeout(() => this.successMessage = '', 3000);

      },
      error: (error) => {
        console.error('Error adding consultation type:', error);
        this.errorMessage = 'Failed to add consultation type';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  /**
   * Edit an existing consultation type
   * Opens a pre-filled form for editing
   */
  editConsultationType(type: ConsultationType): void {
    // Pre-fill the form with the selected type's data
    this.newConsultationType = {
      name: type.name,
      description: type.description,
      defaultDuration: type.defaultDuration,
      alzheimerDuration: type.alzheimerDuration,
      requiresCaregiver: type.requiresCaregiver,
      environmentPreset: type.environmentPreset,
      active: type.active
    };

    // Store the ID for update operation
    this.editingTypeId = type.typeId;

    // Optional: Scroll to form or open modal
    this.scrollToForm();

    // Optional: Change active tab to show form
    // this.activeTab = 'consultation-types';

    console.log('Editing consultation type:', type);
  }

  /**
   * Update an existing consultation type after editing
   */
  // Handle edit from child component

  onEditConsultationType(type: ConsultationType): void {
    this.editingTypeId = type.typeId;
    this.editConsultationType(type);
  }

// Handle update from child component
  onUpdateConsultationType(event: {id: string, data: any}): void {
    this.loading = true;
    this.consultationTypeService.updateConsultationType(event.id, event.data).subscribe({
      next: (updatedType) => {
        const index = this.consultationTypesList.findIndex(t => t.typeId === event.id);
        if (index !== -1) {
          this.consultationTypesList[index] = updatedType;
        }
        this.successMessage = 'Consultation type updated successfully';
        this.editingTypeId = undefined;
        this.loading = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error updating consultation type:', error);
        this.errorMessage = 'Failed to update consultation type';
        this.loading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

// Handle cancel edit from child
  onCancelEdit(): void {
    this.editingTypeId = undefined;

  }

  /**
   * Reset the consultation type form
   */
  private resetConsultationTypeForm(): void {
    this.newConsultationType = {
      name: '',
      description: '',
      defaultDuration: 20,
      alzheimerDuration: 25,
      requiresCaregiver: false,
      environmentPreset: 'STANDARD',
      active: true
    };
  }

  /**
   * Optional: Scroll to the form smoothly
   */
  private scrollToForm(): void {
    setTimeout(() => {
      const element = document.getElementById('consultation-type-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }


  // ========== GETTERS ==========

  get todayAppointments(): Appointment[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.appointments.filter(apt => {
      const aptDate = new Date(apt.startDateTime);
      return aptDate >= today && aptDate < tomorrow;
    }).sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  }

  get upcomingAppointments(): Appointment[] {
    const now = new Date();
    return this.appointments
      .filter(apt => {
        const aptDate = new Date(apt.startDateTime);
        const validStatus = ['SCHEDULED', 'CONFIRMED_BY_PATIENT', 'CONFIRMED_BY_CAREGIVER'].includes(apt.status);
        return validStatus && aptDate > now;
      })
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  }



  // ========== EXISTING METHODS ==========

  viewAppointmentDetails(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    // Load patient details logic...
  }

  closeDetailsDialog(): void {
    this.selectedAppointment = null;
  }

  startConsultation(appointment: Appointment): void {
    if (appointment.videoLink) {
      window.open(appointment.videoLink, '_blank');
    }
  }

  joinVideoCall(videoLink: string | undefined): void {
    if (videoLink) {
      window.open(videoLink, '_blank');
    }
  }

  viewPatientProfile(patientId: string): void {
    console.log('Viewing patient profile:', patientId);
  }

  viewPatientHistory(patientId: string): void {
    console.log('Viewing patient history:', patientId);
  }

  onDateSelected(date: string): void {
    this.selectedDate = new Date(date);
  }

   openPrescription(): void {
     if (!this.selectedAppointment) return;

     // Extract patient and appointment data
     const patientId = this.selectedAppointment.patientId;
     const appointmentId = this.selectedAppointment.appointmentId;

     this.router.navigate(['/prescriptions/doctor/prescribe', patientId, appointmentId]);
   }

  enableNotesEditing(): void {
    this.isEditingNotes = true;
  }

  updateNotes(notes: string): void {
    if (!this.selectedAppointment) return;

    const appointmentId = this.selectedAppointment.appointmentId;
    this.appointmentService.updateDoctorNotes(appointmentId, notes).subscribe({
      next: () => {
        const index = this.appointments.findIndex(a => a.appointmentId === appointmentId);
        if (index !== -1) {
          this.appointments[index].doctorNotes = notes;
        }
        if (this.selectedAppointment?.appointmentId === appointmentId) {
          this.selectedAppointment.doctorNotes = notes;
        }
        this.successMessage = 'Notes updated successfully';
        this.isEditingNotes = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error updating notes:', error);
        this.errorMessage = 'Failed to update notes';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
