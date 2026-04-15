import {EnvironmentPreset} from './consultation-type';

export interface CreateConsultationTypeRequest {
  name: string;
  description: string;
  defaultDurationMinutes: number;
  requiresCaregiver: boolean;
  environmentPreset: EnvironmentPreset;
}

export interface UpdateConsultationTypeRequest {
  name?: string;
  description?: string;
  defaultDurationMinutes?: number;
  requiresCaregiver?: boolean;
  environmentPreset?: EnvironmentPreset;
  active?: boolean;
}
