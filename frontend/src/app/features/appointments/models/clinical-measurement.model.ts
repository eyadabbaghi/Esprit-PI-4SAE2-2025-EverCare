export interface ClinicalMeasurementRequest {
  patientId: string;
  appointmentId?: string;
  weight: number;
  kidneyTestResult: string;
  severeLiverProblem: boolean;
  currentMedications?: string;
  allergies?: string;
}

export interface ClinicalMeasurementResponse {
  measurementId: string;
  patientId: string;
  appointmentId?: string;
  weight: number;
  kidneyTestResult: string;
  severeLiverProblem: boolean;
  currentMedications?: string;
  allergies?: string;
  measuredAt: string;
  measuredBy: string;
}

export interface SafetyCheckResult {
  isSafe: boolean;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  suggestedDose?: string;
  interactions?: string[];
  contraindications?: string[];
}