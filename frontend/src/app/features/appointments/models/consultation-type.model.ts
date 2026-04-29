export interface ConsultationType {
  typeId: string;
  name: string;
  description: string;
  defaultDuration: number;
  alzheimerDuration: number;
  requiresCaregiver: boolean;
  environmentPreset: 'STANDARD' | 'CALM' | 'HIGH_CONTRAST' | 'DARK';
  active: boolean;
}
