export interface DailyMeAlert {
  id: number;
  patientId: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NEW' | 'SEEN' | 'RESOLVED';
  reason?: string | null;
  source?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
}