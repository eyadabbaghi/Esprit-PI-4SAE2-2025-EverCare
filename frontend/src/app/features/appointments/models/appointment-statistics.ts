import {AppointmentStatus} from './appointment';

export interface AppointmentStatistics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  missedAppointments: number;
  upcomingAppointments: number;
  byStatus: Record<AppointmentStatus, number>;
  byDoctor: Record<string, number>;
  byPatient: Record<string, number>;
  averageDuration: number;
  confirmationRate: number;
}
