export interface TypeCountDTO {
  type: string;
  count: number;
}

export interface DayRateDTO {
  day: string;   // "Mon"
  rate: number;  // 0..100
}

export interface PatientDashboardInsightsDTO {
  patientId: string;

  activeTasks: number;
  completedActive: number;
  completionRate: number; // 0..100
  missedHistory: number;

  taskTypeDistribution: TypeCountDTO[];
  weeklyCompletionTrend: DayRateDTO[];

  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  riskReasons: string[];
  suggestedNotes: string[];
  detectedKeywords: string[];
}