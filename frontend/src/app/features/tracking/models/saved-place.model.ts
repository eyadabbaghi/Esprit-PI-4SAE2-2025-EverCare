export interface SavedPlace {
  id?: number;
  patientId: string;
  label: string;
  addressText: string;
  lat: number;
  lng: number;
  createdAt?: string;
}