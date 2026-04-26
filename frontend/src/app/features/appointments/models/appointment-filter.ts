import {AppointmentStatus} from './appointment';

export interface AppointmentFilter {
  patientId?: string;
  doctorId?: string;
  caregiverId?: string;
  status?: AppointmentStatus;
  startDate?: Date;
  endDate?: Date;
  consultationTypeId?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}
