import { AlzheimerStage } from './medical-record.model';

export interface AssessmentReport {
  id: string;
  patientId: string;
  patientName: string | null;
  caregiverName: string | null;
  answers: Record<string, number>;
  score: number;
  computedStage: AlzheimerStage;
  recommendation: string;
  doctorNote: string | null;
  needsAttention: boolean;
  active: boolean;
  createdAt: string;
}

export type ClinicalAlertStatus = 'OPEN' | 'ACK' | 'RESOLVED';

export interface ClinicalAlert {
  id: string;
  assessmentReportId: string;
  patientId: string;
  patientName: string | null;
  scoreAtTrigger: number;
  stageAtTrigger: AlzheimerStage;
  reason: string;
  status: ClinicalAlertStatus;
  active: boolean;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalAlertPage {
  content: ClinicalAlert[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface AssessmentCreateRequest {
  patientId: string;
  patientName?: string | null;
  caregiverName?: string | null;
  answers: Record<string, number>;
}

export interface AssessmentDoctorNoteRequest {
  note: string;
}

export interface AssessmentPage {
  content: AssessmentReport[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export type AssessmentStageFilter = AlzheimerStage | '';
