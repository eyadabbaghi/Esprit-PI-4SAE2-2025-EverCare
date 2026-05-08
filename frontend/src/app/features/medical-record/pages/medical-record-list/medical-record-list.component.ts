import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { MedicalRecord } from '../../models/medical-record.model';
import { MedicalRecordService } from '../../services/medical-record.service';
import { AssessmentService } from '../../services/assessment.service';
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
  private readonly patientNameById = new Map<string, string>();
  private readonly patientNameLoading = new Set<string>();
  private associatedRecords: MedicalRecord[] = [];

  isLoading = false;
  errorMessage = '';

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  activeFilter: 'active' | 'archived' | 'all' = 'active';
  isSearchMode = false;

  criticalCount = 0;
  activeCount = 0;
  totalCount = 0;
  archivedCount = 0;
  isStatsLoading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly assessmentService: AssessmentService
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
        if (this.isCareTeamRole) {
          this.loadAssociatedRecords();
          return;
        }

        this.refreshStats();
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

    if (this.isCareTeamRole) {
      this.isSearchMode = true;
      this.applyCareTeamFilters();
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.isSearchMode = true;

    this.medicalRecordService.getByPatientId(patientId).subscribe({
      next: (record) => {
        this.records = [record];
        this.hydratePatientNames(this.records);
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
    if (this.isCareTeamRole) {
      this.applyCareTeamFilters();
      return;
    }
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

    if (this.isCareTeamRole) {
      this.loadAssociatedRecords();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.medicalRecordService.getPage(page, this.size, this.resolveActiveParam()).subscribe({
      next: (response) => {
        this.records = response.content;
        this.hydratePatientNames(this.records);
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
    if (this.isCareTeamRole) {
      this.applyCareTeamFilters();
      return;
    }

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
        this.refreshStats();
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
        this.refreshStats();
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

  get isCareTeamRole(): boolean {
    return this.currentRole === 'DOCTOR' || this.currentRole === 'CAREGIVER';
  }

  private loadOwnRecord(): void {
    this.records = [];
    this.page = 0;
    this.totalPages = 1;
    this.totalElements = 0;
    this.isSearchMode = true;
    this.searchControl.setValue('');

    if (this.patientIdentifierCandidates.length === 0) {
      this.errorMessage = 'Patient not found. Please sign in again.';
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.tryLoadOwnRecordCandidate(0, false);
  }

  private tryLoadOwnRecordCandidate(index: number, hasTechnicalError: boolean): void {
    if (index >= this.patientIdentifierCandidates.length) {
      // If no record exists yet, fall back to backend auto-creation so patient
      // self-service pages do not stay empty on first use.
      if (!hasTechnicalError) {
        this.ensureOwnRecord();
        return;
      }

      this.isLoading = false;
      if (hasTechnicalError) {
        this.errorMessage = 'Unable to load your medical record.';
      }
      return;
    }

    const candidate = this.patientIdentifierCandidates[index];
    this.medicalRecordService.getByPatientId(candidate).subscribe({
      next: (record) => {
        this.patientIdentifier = candidate;
        this.records = [record];
        this.hydratePatientNames(this.records);
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
        this.errorMessage = 'Unable to load your medical record.';
      }
    });
  }

  private ensureOwnRecord(): void {
    // Reuse the primary stable identifier when creating the default record.
    const patientId = this.getPrimaryPatientIdentifier();
    if (!patientId) {
      this.isLoading = false;
      this.errorMessage = 'Patient not found. Please sign in again.';
      return;
    }

    this.medicalRecordService.ensureForPatientId(patientId).subscribe({
      next: (record) => {
        this.patientIdentifier = record.patientId;
        this.records = [record];
        this.hydratePatientNames(this.records);
        this.totalElements = 1;
        this.totalPages = 1;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load your medical record.';
      }
    });
  }

  private getPrimaryPatientIdentifier(): string {
    return this.patientIdentifierCandidates[0]?.trim() ?? '';
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

    // Patient self-service should prefer stable identifiers and avoid probing
    // unrelated values like display names, which only create noisy 404s.
    if (!this.isPatientRole && user?.email && user.email.trim()) {
      candidates.push(user.email.trim());
    }

    if (!this.isPatientRole && user?.name && user.name.trim()) {
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

  getPatientDisplayName(record: MedicalRecord): string {
    if (this.isPatientRole) {
      const fromUser = this.currentUser?.name?.trim();
      if (fromUser) {
        return fromUser;
      }
    }

    return this.resolvePatientName(record.patientId);
  }

  private refreshStats(): void {
    if (!this.permissions.canRead || this.isPatientRole || this.isCareTeamRole) {
      return;
    }

    this.isStatsLoading = true;

    forkJoin({
      total: this.medicalRecordService.getPage(0, 1),
      active: this.medicalRecordService.getPage(0, 1, true),
      archived: this.medicalRecordService.getPage(0, 1, false),
      critical: this.assessmentService.getAlerts(0, 1)
    }).subscribe({
      next: ({ total, active, archived, critical }) => {
        this.totalCount = total.totalElements;
        this.activeCount = active.totalElements;
        this.archivedCount = archived.totalElements;
        this.criticalCount = critical.totalElements;
        this.isStatsLoading = false;
      },
      error: () => {
        this.isStatsLoading = false;
      }
    });
  }

  private loadAssociatedRecords(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.isSearchMode = !!this.searchControl.value.trim();

    this.loadAssociatedPatients().subscribe({
      next: (patients) => {
        if (patients.length === 0) {
          this.associatedRecords = [];
          this.records = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.resetCareTeamStats([]);
          this.isLoading = false;
          return;
        }

        const requests = patients.map((patient) => this.loadRecordForPatient(patient));
        forkJoin(requests).subscribe({
          next: (records) => {
            this.associatedRecords = records.filter((record): record is MedicalRecord => !!record);
            this.hydratePatientNames(this.associatedRecords);
            this.applyCareTeamFilters();
            this.refreshCareTeamStats(this.associatedRecords);
            this.isLoading = false;
          },
          error: () => {
            this.associatedRecords = [];
            this.records = [];
            this.resetCareTeamStats([]);
            this.errorMessage = 'Unable to load associated patient medical records.';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.associatedRecords = [];
        this.records = [];
        this.resetCareTeamStats([]);
        this.errorMessage = 'Unable to load associated patients.';
        this.isLoading = false;
      }
    });
  }

  private applyCareTeamFilters(): void {
    const query = this.searchControl.value.trim().toLowerCase();
    let filtered = this.associatedRecords.slice();

    if (this.activeFilter === 'active') {
      filtered = filtered.filter((record) => record.active);
    } else if (this.activeFilter === 'archived') {
      filtered = filtered.filter((record) => !record.active);
    }

    if (query) {
      filtered = filtered.filter((record) => {
        const patientName = this.getPatientDisplayName(record).toLowerCase();
        return patientName.includes(query) || record.patientId.toLowerCase().includes(query);
      });
    }

    this.records = filtered;
    this.page = 0;
    this.totalElements = filtered.length;
    this.totalPages = filtered.length > 0 ? 1 : 0;
  }

  private loadAssociatedPatients(): Observable<User[]> {
    const currentEmail = String(this.currentUser?.email || '').trim().toLowerCase();
    const directEmails = this.normalizeEmailList(this.currentUser?.patientEmails || []);
    const directRequests = directEmails.map((email) =>
      this.authService.getUserByEmail(email).pipe(catchError(() => of(null)))
    );

    const direct$ = directRequests.length > 0 ? forkJoin(directRequests) : of([]);
    const fallback$ = this.authService.searchUsersByRole('', 'PATIENT').pipe(catchError(() => of([])));

    return forkJoin({ direct: direct$, fallback: fallback$ }).pipe(
      map(({ direct, fallback }) => {
        const associated = new Map<string, User>();

        for (const patient of direct) {
          if (patient) {
            associated.set(this.patientAssociationKey(patient), patient);
          }
        }

        for (const patient of fallback || []) {
          if (this.isAssociatedPatientUser(patient, currentEmail)) {
            associated.set(this.patientAssociationKey(patient), patient);
          }
        }

        return Array.from(associated.values());
      })
    );
  }

  private loadRecordForPatient(patient: User): Observable<MedicalRecord | null> {
    const candidates = this.resolveRecordCandidates(patient);
    return this.tryLoadRecordCandidate(candidates, 0);
  }

  private tryLoadRecordCandidate(candidates: string[], index: number): Observable<MedicalRecord | null> {
    if (index >= candidates.length) {
      return of(null);
    }

    return this.medicalRecordService.getByPatientId(candidates[index]).pipe(
      catchError(() => this.tryLoadRecordCandidate(candidates, index + 1))
    );
  }

  private resolveRecordCandidates(patient: User): string[] {
    const candidates = [
      patient.userId,
      patient.email,
      patient.name
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    return this.uniqueNormalized(candidates);
  }

  private isAssociatedPatientUser(patient: User, currentEmail: string): boolean {
    if (!currentEmail) {
      return false;
    }

    if (this.currentRole === 'DOCTOR') {
      return String(patient.doctorEmail || '').trim().toLowerCase() === currentEmail;
    }

    const caregiverEmails = this.normalizeEmailList(patient.caregiverEmails || []);
    return caregiverEmails.some((email) => email.toLowerCase() === currentEmail);
  }

  private refreshCareTeamStats(records: MedicalRecord[]): void {
    this.resetCareTeamStats(records);

    if (records.length === 0) {
      return;
    }

    this.isStatsLoading = true;
    const requests = records.map((record) =>
      this.assessmentService.getByPatient(record.patientId).pipe(
        map((reports) => (reports || []).some((report) => report.needsAttention) ? 1 : 0),
        catchError(() => of(0))
      )
    );

    forkJoin(requests).subscribe({
      next: (counts) => {
        this.criticalCount = counts.reduce((sum, count) => sum + count, 0);
        this.isStatsLoading = false;
      },
      error: () => {
        this.criticalCount = 0;
        this.isStatsLoading = false;
      }
    });
  }

  private resetCareTeamStats(records: MedicalRecord[]): void {
    this.totalCount = records.length;
    this.activeCount = records.filter((record) => record.active).length;
    this.archivedCount = records.filter((record) => !record.active).length;
    this.criticalCount = 0;
  }

  private patientAssociationKey(patient: User): string {
    return String(patient.userId || patient.email || patient.name || '').trim().toLowerCase();
  }

  private normalizeEmailList(emails: string[]): string[] {
    return this.uniqueNormalized(emails);
  }

  private uniqueNormalized(values: string[]): string[] {
    const seen = new Set<string>();
    return values
      .map((value) => String(value || '').trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (!key || seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }

  private hydratePatientNames(records: MedicalRecord[]): void {
    if (records.length === 0) {
      return;
    }

    for (const record of records) {
      const patientId = record.patientId.trim();
      const normalizedId = patientId.toLowerCase();

      if (!this.isUuid(patientId)) {
        this.patientNameById.set(normalizedId, patientId);
        continue;
      }

      if (this.patientNameById.has(normalizedId) || this.patientNameLoading.has(normalizedId)) {
        continue;
      }

      this.patientNameLoading.add(normalizedId);
      this.assessmentService.getByPatient(patientId).subscribe({
        next: (reports) => {
          const reportWithName = reports.find(
            (report) => typeof report.patientName === 'string' && report.patientName.trim().length > 0
          );

          if (reportWithName?.patientName) {
            this.patientNameById.set(normalizedId, reportWithName.patientName.trim());
          }

          this.patientNameLoading.delete(normalizedId);
        },
        error: () => {
          this.patientNameLoading.delete(normalizedId);
        }
      });
    }
  }

  private resolvePatientName(patientId: string): string {
    const normalizedId = patientId.trim().toLowerCase();
    const resolvedName = this.patientNameById.get(normalizedId);
    if (resolvedName) {
      return resolvedName;
    }

    if (this.isUuid(patientId)) {
      return 'Not provided';
    }

    return patientId;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
  }
}
