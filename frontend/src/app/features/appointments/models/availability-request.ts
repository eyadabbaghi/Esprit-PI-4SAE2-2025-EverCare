import {DayOfWeek, RecurrenceType} from './availability';

export interface CreateAvailabilityRequest {
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  validFrom?: Date;
  validTo?: Date;
  recurrence?: RecurrenceType;
}

export interface CreateWeeklyAvailabilityRequest {
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  validFrom?: Date;
  validTo?: Date;
}

export interface BlockSlotRequest {
  reason: string;
}
