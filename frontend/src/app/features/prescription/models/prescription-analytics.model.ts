export interface PrescriptionAnalyticsSummary {
  total: number;
  active: number;
  expired: number;
  expiringSoon: number;
  renewed: number;
  interrupted: number;
  completed: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TopMedicament {
  medicamentId: string;
  nomCommercial: string;
  prescriptionCount: number;
  photoUrl?: string;
  dosage?: string;
  forme?: string;
  denominationCommuneInternationale?: string;
}
