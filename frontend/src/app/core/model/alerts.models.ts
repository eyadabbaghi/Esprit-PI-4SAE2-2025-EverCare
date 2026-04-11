export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentType = 'Medical' | 'Behavioral' | 'Safety';
export type AlertStatus = 'SENT' | 'ACKNOWLEDGED' | 'RESOLVED';

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
}