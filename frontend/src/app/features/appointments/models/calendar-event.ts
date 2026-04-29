import {AppointmentStatus} from './appointment';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: EventColor;
  meta?: {
    appointmentId: string;
    patientName: string;
    doctorName: string;
    status: AppointmentStatus;
    consultationType: string;
  };
}

export interface EventColor {
  primary: string;
  secondary: string;
}
