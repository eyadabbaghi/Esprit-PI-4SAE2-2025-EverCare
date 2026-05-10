export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentType = 'Medical' | 'Behavioral' | 'Safety';
export type AlertStatus = 'SENT' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface DoctorRecommendation {
  recommendationId: string;
  incidentId: string;
  doctorId: string;
  doctorName: string;
  recommendation: string;
  createdAt: Date;
}

export interface Incident {
  incidentId: string;
  title: string;
  type: IncidentType;
  severity: Severity;
  description: string;
  patientId: string;
  patientName?: string;
  location: string;
  incidentDate: Date;
  reportedByUserId: string;
  status: 'OPEN' |'ACKNOWLEDGED' | 'RESOLVED';
  aiSuggestion?: string;
  doctorRecommendations?: DoctorRecommendation[];
  
}

export interface Alert {
  alertId: string;
  incidentId: string;
  senderId: string;
  targetId: string;
  status: AlertStatus;
  sentAt: Date;
  acknowledgedAt?: Date;
  targetRoles?: string[];
  notificationChannels?: string[];
  label?: string;
  immediate?: boolean;
  scheduledTime?: string;
  repeatDays?: string[];
}
