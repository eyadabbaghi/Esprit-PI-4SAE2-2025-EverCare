export interface Availability {
  availabilityId: string;
  doctorId: string;
  doctorName?: string;
  dayOfWeek: string;
  day?: string;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  validFrom: Date;
  validTo: Date;
  recurrence: string;
  isBlocked: boolean;
  blockReason?: string;
  alzheimerFriendly?: boolean;
}

export interface AvailabilityStats {
  weeklyHours: number;
  availableSlots: number;
  bookedThisWeek: number;

}
