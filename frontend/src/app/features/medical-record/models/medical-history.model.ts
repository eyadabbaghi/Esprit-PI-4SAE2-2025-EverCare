export type MedicalHistoryType = 'CONSULTATION' | 'INCIDENT' | 'MEDICATION' | 'VITAL_SIGN';

export interface MedicalHistory {
  id: string;
  type: MedicalHistoryType;
  date: string;
  description: string;
}

export interface CreateMedicalHistoryRequest {
  type: MedicalHistoryType;
  date: string;
  description: string;
}

export type UpdateMedicalHistoryRequest = Partial<CreateMedicalHistoryRequest>;
