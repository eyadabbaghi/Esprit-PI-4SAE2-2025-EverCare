export interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
  doctorId: string;
  doctorName?: string;
  consultationTypeId?: string;
}

export interface AvailableSlotRequest {
  doctorId: string;
  date: Date;
  durationMinutes: number;
}
