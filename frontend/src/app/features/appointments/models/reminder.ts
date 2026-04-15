export interface Reminder {
  reminderId: string;
  appointmentId: string;
  userId: string;
  userName?: string;
  reminderType: ReminderType;
  scheduledTime: Date;
  sentTime?: Date;
  status: ReminderStatus;
  message: string;
  confirmationReceived: boolean;
  confirmationTime?: Date;
}

export type ReminderType = 'SMS' | 'CALL' | 'EMAIL' | 'VOICE' | 'PUSH';

export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CONFIRMED';
