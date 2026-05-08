import { MedicalRecord } from '../models/medical-record.model';

export interface MedicalRecordPermissions {
  canRead: boolean;
  canViewDetails: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  canManageHistory: boolean;
  canManageDocuments: boolean;
}

export function getMedicalRecordPermissions(roleInput: string | null | undefined): MedicalRecordPermissions {
  const role = resolveRole(roleInput);

  if (role === 'DOCTOR' || role === 'ADMIN') {
    return {
      canRead: true,
      canViewDetails: true,
      canCreate: true,
      canUpdate: true,
      canArchive: true,
      canManageHistory: true,
      canManageDocuments: true,
    };
  }

  if (role === 'PATIENT') {
    return {
      canRead: true,
      canViewDetails: true,
      canCreate: true,
      canUpdate: true,
      canArchive: false,
      canManageHistory: false,
      canManageDocuments: true,
    };
  }

  if (role === 'CAREGIVER') {
    return {
      canRead: true,
      canViewDetails: true,
      canCreate: false,
      canUpdate: false,
      canArchive: false,
      canManageHistory: false,
      canManageDocuments: false,
    };
  }

  return {
    canRead: false,
    canViewDetails: false,
    canCreate: false,
    canUpdate: false,
    canArchive: false,
    canManageHistory: false,
    canManageDocuments: false,
  };
}

export function canManageArchivedRecord(record: MedicalRecord): boolean {
  return record.active;
}

export function resolveRole(roleInput: string | null | undefined): string | undefined {
  if (roleInput && roleInput.trim()) {
    return roleInput.trim().toUpperCase();
  }

  if (typeof window !== 'undefined') {
    const localRole = window.localStorage.getItem('role');
    if (localRole && localRole.trim()) {
      return localRole.trim().toUpperCase();
    }
  }

  return undefined;
}
