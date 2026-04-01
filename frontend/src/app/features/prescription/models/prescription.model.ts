export interface PatientSummary {
  userId: string;
  name: string;
  email: string;
}

export interface DoctorSummary {
  userId: string;
  name: string;
  specialization?: string;
}

export interface MedicamentSummary {
  medicamentId: string;
  nomCommercial: string;
  denominationCommuneInternationale: string;
  dosage: string;
  forme: string;
  photoUrl?: string;
  noticeSimplifiee?: string;
}

export interface AppointmentSummary {
  appointmentId: string;
  appointmentDate: string;
  status: string;
}

export interface Prescription {
  prescriptionId: string;
  patient: PatientSummary;
  doctor: DoctorSummary;
  medicament: MedicamentSummary;
  appointment?: AppointmentSummary;

  datePrescription: string;
  dateDebut: string;
  dateFin: string;

  posologie: string;
  instructions?: string;

  statut: 'ACTIVE' | 'TERMINEE' | 'INTERROMPUE' | 'RENOUVELEE' | 'EXPIREE';
  renouvelable: boolean;
  nombreRenouvellements: number;

  priseMatin?: string;
  priseMidi?: string;
  priseSoir?: string;
  resumeSimple?: string;

  pdfUrl?: string;
  notesMedecin?: string;

  createdAt: string;
  updatedAt?: string;
}

export interface PrescriptionRequest {
  patientId: string;
  doctorId: string;
  medicamentId: string;
  appointmentId?: string;

  dateDebut: string;
  dateFin: string;

  posologie: string;
  instructions?: string;

  renouvelable: boolean;
  nombreRenouvellements: number;

  priseMatin?: string;
  priseMidi?: string;
  priseSoir?: string;
  resumeSimple?: string;

  notesMedecin?: string;
}
