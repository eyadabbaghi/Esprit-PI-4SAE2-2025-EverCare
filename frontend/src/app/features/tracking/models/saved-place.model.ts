export interface SavedPlace {
  id?: number;
  patientId: string;
  label: string;
  addressText: string;
  lat: number;
  lng: number;

  // 🔥 NEW
  status?: 'SAFE' | 'IDLE' | 'DANGER';
  duration?: string; // e.g. "2h"
}