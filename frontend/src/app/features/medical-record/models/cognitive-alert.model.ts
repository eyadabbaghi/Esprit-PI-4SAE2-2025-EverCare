export interface CognitiveAlert {
  id: string;
  medicalRecordId: string;
  patientId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  acknowledgedAt?: string;
}


