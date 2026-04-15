export interface Appointment {
  appointmentId: string;
  patientId: string;
  patientName?: string;
  patientPhoto?: string;
  doctorId: string;
  doctorName?: string;
  doctorPhoto?: string;
  caregiverId?: string;
  caregiverName?: string;
  consultationTypeId: string;
  consultationTypeName?: string;
  startDateTime: Date;
  endDateTime: Date;
  status: AppointmentStatus;
  confirmationDatePatient?: Date;
  confirmationDateCaregiver?: Date;
  caregiverPresence?: CaregiverPresence;
  videoLink?: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  doctorNotes?: string;
  simpleSummary?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED_BY_PATIENT'
  | 'CONFIRMED_BY_CAREGIVER'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'MISSED'
  |'IN_PROGRESS';


export type CaregiverPresence = 'PHYSICAL' | 'REMOTE' | 'NONE';

export type RecurrencePattern = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ONCE';
