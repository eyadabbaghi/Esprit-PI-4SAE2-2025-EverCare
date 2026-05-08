import {AppointmentStatus, CaregiverPresence, RecurrencePattern} from './appointment';

export interface CreateAppointmentRequest {
  patientId: string;
  patientName?: string; // Optional, backend might ignore
  doctorId: string;
  doctorName?: string; // Optional, backend might ignore
  caregiverId?: string;
  caregiverName?: string; // Optional, backend might ignore
  consultationTypeId: string;
  consultationTypeName?: string; // Optional, backend might ignore
  startDateTime: Date | string;
  endDateTime: Date | string;
  status?: string;
  caregiverPresence: string;
  videoLink?: string;
  simpleSummary?: string;
  // Additional fields your DTO might have
  isRecurring?: boolean;
  recurrencePattern?: string;
  doctorNotes?: string;
}

export interface UpdateAppointmentRequest {
  startDateTime?: Date;
  status?: AppointmentStatus;
  caregiverPresence?: CaregiverPresence;
  doctorNotes?: string;
  simpleSummary?: string;
  caregiverId?: string;
  consultationTypeId?: string;
}

export interface ConfirmAppointmentRequest {
  confirmationDate: Date;
}
