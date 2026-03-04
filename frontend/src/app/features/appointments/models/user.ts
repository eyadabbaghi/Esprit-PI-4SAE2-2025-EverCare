
export interface User {
  userId?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isVerified?: boolean;
  createdAt?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  yearsExperience?: number;
  specialization?: string;
  medicalLicense?: string;
  workplaceType?: string;
  workplaceName?: string;
  caregiverEmails?: string[];
  patientEmails?: string[];
  doctorEmail?: string;
}
export type UserRole = 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN';

export type AlzheimerStage = 'LEGER' | 'MODERE' | 'AVANCE';

export type CaregiverAccessLevel = 'PRIMARY' | 'SECONDARY' | 'READ_ONLY';
