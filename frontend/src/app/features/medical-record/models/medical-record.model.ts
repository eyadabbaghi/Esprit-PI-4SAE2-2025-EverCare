export type AlzheimerStage = 'EARLY' | 'MIDDLE' | 'LATE';

export interface MedicalRecord {
  id: string;
  patientId: string;
  bloodGroup: string | null;
  alzheimerStage: AlzheimerStage | null;
  allergies: string | null;
  chronicDiseases: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecordPage {
  content: MedicalRecord[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface CreateMedicalRecordRequest {
  patientId: string;
  bloodGroup?: string | null;
  alzheimerStage?: AlzheimerStage | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface UpdateMedicalRecordRequest {
  bloodGroup?: string | null;
  alzheimerStage?: AlzheimerStage | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}
