export interface Medicament {
  medicamentId: string;
  codeCIP?: string;

  nomCommercial: string;
  denominationCommuneInternationale: string;
  dosage?: string;
  forme?: string;
  laboratoire?: string;

  indications?: string;
  contreIndications?: string;
  effetsSecondaires?: string;

  photoUrl?: string;
  noticeSimplifiee?: string;

  actif: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface MedicamentRequest {
  nomCommercial: string;
  denominationCommuneInternationale: string;
  dosage?: string;
  forme?: string;
  codeCIP?: string;
  laboratoire?: string;
  indications?: string;
  contreIndications?: string;
  effetsSecondaires?: string;
  photoUrl?: string;
  noticeSimplifiee?: string;
}

export interface MedicamentFilterParams {
  keyword?: string;
  actif?: boolean;
  laboratoire?: string;
  forme?: string;
  dosage?: string;
  used?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface MedicamentUsageStats {
  medicamentId: string;
  nomCommercial: string;
  actif: boolean;
  totalPrescriptions: number;
  activePrescriptions: number;
  lastPrescribedDate?: string;
}

export interface MedicamentAnalyticsSummary {
  totalMedicaments: number;
  activeMedicaments: number;
  inactiveMedicaments: number;
  usedMedicaments: number;
  unusedMedicaments: number;
  deactivatedUsedMedicaments: number;
}
