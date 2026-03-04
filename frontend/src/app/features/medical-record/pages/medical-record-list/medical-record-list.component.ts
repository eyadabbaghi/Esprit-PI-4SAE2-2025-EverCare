import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { MedicalRecord } from '../../models/medical-record.model';
import { MedicalRecordService } from '../../services/medical-record.service';
import {
  getMedicalRecordPermissions,
  MedicalRecordPermissions,
  resolveRole,
} from '../../utils/medical-record-permissions';

@Component({
  selector: 'app-medical-record-list',
  templateUrl: './medical-record-list.component.html',
  styleUrl: './medical-record-list.component.css'
})
export class MedicalRecordListComponent implements OnInit {
  records: MedicalRecord[] = [];
  readonly searchControl = new FormControl('', { nonNullable: true });
  permissions: MedicalRecordPermissions = getMedicalRecordPermissions(null);
  currentUser: User | null = null;
  currentRole: string | undefined;
  patientIdentifier = '';
  patientIdentifierCandidates: string[] = [];

  isLoading = false;
  errorMessage = '';

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  activeFilter: 'active' | 'archived' | 'all' = 'active';
  isSearchMode = false;

  constructor(
    private readonly authService: AuthService,
    private readonly medicalRecordService: MedicalRecordService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.currentRole = resolveRole(user?.role);
      this.permissions = getMedicalRecordPermissions(this.currentRole);
      this.patientIdentifierCandidates = this.resolvePatientIdentifierCandidates(user);
      this.patientIdentifier = this.patientIdentifierCandidates[0] || '';

      if (this.isPatientRole) {
        this.loadOwnRecord();
        return;
      }

      if (this.permissions.canRead) {
        this.loadPage(0);
      }
    });
  }

  searchByPatientId(): void {
    if (this.isPatientRole) {
      return;
    }

    const patientId = this.searchControl.value.trim();
    if (!patientId) {
      this.resetSearch();
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.isSearchMode = true;

    this.medicalRecordService.getByPatientId(patientId).subscribe({
      next: (record) => {
        this.records = [record];
        this.totalElements = 1;
        this.totalPages = 1;
        this.page = 0;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        if (error.status === 404) {
          this.records = [];
          this.totalElements = 0;
          this.totalPages = 0;
          return;
        }
        this.errorMessage = 'Failed to search medical record by patientId.';
      }
    });
  }

  resetSearch(): void {
    if (this.isPatientRole) {
      this.loadOwnRecord();
      return;
    }

    this.searchControl.setValue('');
    this.isSearchMode = false;
    this.loadPage(0);
  }

  loadPage(page: number): void {
    if (!this.permissions.canRead) {
      this.records = [];
      this.totalElements = 0;
      this.totalPages = 0;
      this.errorMessage = '';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.medicalRecordService.getPage(page, this.size, this.resolveActiveParam()).subscribe({
      next: (response) => {
        this.records = response.content;
        this.page = response.number;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load medical records.';
        this.isLoading = false;
      }
    });
  }

  changeFilter(filter: 'active' | 'archived' | 'all'): void {
    if (this.isPatientRole) {
      return;
    }

    this.activeFilter = filter;
    if (!this.isSearchMode) {
      this.loadPage(0);
    }
  }

  previousPage(): void {
    if (this.page <= 0 || this.isSearchMode || this.isPatientRole) {
      return;
    }
    this.loadPage(this.page - 1);
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages || this.isSearchMode || this.isPatientRole) {
      return;
    }
    this.loadPage(this.page + 1);
  }

  archive(record: MedicalRecord): void {
    if (!record.active || !this.permissions.canArchive) {
      return;
    }

    this.medicalRecordService.archive(record.id).subscribe({
      next: () => {
        if (this.isSearchMode) {
          this.searchByPatientId();
          return;
        }
        this.loadPage(this.page);
      },
      error: () => {
        this.errorMessage = 'Failed to archive medical record.';
      }
    });
  }

  restore(record: MedicalRecord): void {
    if (record.active || this.currentRole !== 'ADMIN') {
      return;
    }

    this.medicalRecordService.restore(record.id).subscribe({
      next: () => {
        if (this.isSearchMode) {
          this.searchByPatientId();
          return;
        }
        this.loadPage(this.page);
      },
      error: () => {
        this.errorMessage = 'Failed to restore medical record.';
      }
    });
  }

  private resolveActiveParam(): boolean | undefined {
    if (this.activeFilter === 'active') {
      return true;
    }
    if (this.activeFilter === 'archived') {
      return false;
    }
    return undefined;
  }

  get isPatientRole(): boolean {
    return this.currentRole === 'PATIENT';
  }

  private loadOwnRecord(): void {
    this.records = [];
    this.page = 0;
    this.totalPages = 1;
    this.totalElements = 0;
    this.isSearchMode = true;
    this.searchControl.setValue('');

    if (this.patientIdentifierCandidates.length === 0) {
      this.errorMessage = 'Patient introuvable. Veuillez vous reconnecter.';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.tryLoadOwnRecordCandidate(0, false);
  }

  private tryLoadOwnRecordCandidate(index: number, hasTechnicalError: boolean): void {
    if (index >= this.patientIdentifierCandidates.length) {
      this.isLoading = false;
      if (hasTechnicalError) {
        this.errorMessage = 'Impossible de charger votre dossier médical.';
      }
      return;
    }

    const candidate = this.patientIdentifierCandidates[index];
    this.medicalRecordService.getByPatientId(candidate).subscribe({
      next: (record) => {
        this.patientIdentifier = candidate;
        this.records = [record];
        this.totalElements = 1;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.tryLoadOwnRecordCandidate(index + 1, hasTechnicalError);
          return;
        }

        // Try next candidate before showing a blocking error.
        if (index + 1 < this.patientIdentifierCandidates.length) {
          this.tryLoadOwnRecordCandidate(index + 1, true);
          return;
        }

        this.isLoading = false;
        this.errorMessage = 'Impossible de charger votre dossier médical.';
      }
    });
  }

  private resolvePatientIdentifierCandidates(user: User | null): string[] {
    const candidates: string[] = [];
    if (typeof window !== 'undefined') {
      const localPatientId = window.localStorage.getItem('patientId');
      if (localPatientId && localPatientId.trim()) {
        candidates.push(localPatientId.trim());
      }
    }

    if (user?.userId && user.userId.trim()) {
      candidates.push(user.userId.trim());
    }
    if (user?.email && user.email.trim()) {
      candidates.push(user.email.trim());
    }
    if (user?.name && user.name.trim()) {
      candidates.push(user.name.trim());
    }

    const seen = new Set<string>();
    return candidates.filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
