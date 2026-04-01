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
