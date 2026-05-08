import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { AlzheimerStage, CreateMedicalRecordRequest, MedicalRecord, UpdateMedicalRecordRequest } from '../../models/medical-record.model';
import { MedicalRecordService } from '../../services/medical-record.service';
import { getMedicalRecordPermissions, MedicalRecordPermissions, resolveRole } from '../../utils/medical-record-permissions';

@Component({
  selector: 'app-medical-record-form',
  templateUrl: './medical-record-form.component.html',
  styleUrl: './medical-record-form.component.css'
})
export class MedicalRecordFormComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly stageOptions: AlzheimerStage[] = ['EARLY', 'MIDDLE', 'LATE'];
  readonly bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly form = this.formBuilder.group({
    patientId: this.formBuilder.control('', [Validators.required, Validators.maxLength(100)]),
    bloodGroup: this.formBuilder.control('', [Validators.pattern(/^(A|B|AB|O)[+-]$/)]),
    alzheimerStage: this.formBuilder.control<AlzheimerStage | ''>('EARLY'),
    allergies: this.formBuilder.control('', [Validators.maxLength(1000)]),
    chronicDiseases: this.formBuilder.control('', [Validators.maxLength(1000)]),
    emergencyContactName: this.formBuilder.control('', [Validators.maxLength(255)]),
    emergencyContactPhone: this.formBuilder.control('', [Validators.pattern(/^[0-9+\-\s()]{6,32}$/)])
  });

  isEditMode = false;
  recordId = '';
  useAutoCreate = true;
  isSubmitting = false;
  isLoading = false;
  errorMessage = '';
  currentUser: User | null = null;
  currentRole: string | undefined;
  permissions: MedicalRecordPermissions = getMedicalRecordPermissions(undefined);

  constructor(
    private readonly authService: AuthService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.currentRole = resolveRole(user?.role);
      this.permissions = getMedicalRecordPermissions(this.currentRole);
      this.updateStageEditPermission();
      this.prefillPatientForOwnRecord(user);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.isEditMode = true;
    this.recordId = id;
    this.form.controls.patientId.disable();
    this.isLoading = true;

    this.medicalRecordService.getById(this.recordId).subscribe({
      next: (record) => {
        if (this.currentRole === 'PATIENT' && !this.isOwnRecord(record)) {
          this.errorMessage = 'You can only edit your own medical record.';
          this.isLoading = false;
          return;
        }

        this.form.patchValue(this.toForm(record));
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load medical record.';
        this.isLoading = false;
      }
    });
  }

  save(): void {
    if (this.isEditMode && !this.permissions.canUpdate) {
      this.errorMessage = 'You are not allowed to edit this medical record.';
      return;
    }
    if (!this.isEditMode && !this.permissions.canCreate) {
      this.errorMessage = 'You are not allowed to create a medical record.';
      return;
    }

    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage = '';
    this.isSubmitting = true;

    const raw = this.form.getRawValue();
    const updatePayload: UpdateMedicalRecordRequest = {
      bloodGroup: this.toNullable(raw.bloodGroup),
      alzheimerStage: raw.alzheimerStage === '' ? null : raw.alzheimerStage,
      allergies: this.toNullable(raw.allergies),
      chronicDiseases: this.toNullable(raw.chronicDiseases),
      emergencyContactName: this.toNullable(raw.emergencyContactName),
      emergencyContactPhone: this.toNullable(raw.emergencyContactPhone)
    };

    if (this.isEditMode && this.recordId) {
      this.medicalRecordService.update(this.recordId, updatePayload).subscribe({
        next: (updated) => {
          this.isSubmitting = false;
          this.router.navigate(['/medical-record', updated.id]);
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.errorMessage = this.extractError(error);
        }
      });
      return;
    }

    const createPayload: CreateMedicalRecordRequest = {
      patientId: raw.patientId.trim(),
      ...updatePayload
    };

    const create$ = this.useAutoCreate
      ? this.medicalRecordService.autoCreate(createPayload)
      : this.medicalRecordService.create(createPayload);

    create$.subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.router.navigate(['/medical-record', created.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage = this.extractError(error);
      }
    });
  }

  cancel(): void {
    if (this.isEditMode && this.recordId) {
      this.router.navigate(['/medical-record', this.recordId]);
      return;
    }
    this.router.navigate(['/medical-record']);
  }

  private toForm(record: MedicalRecord): {
    patientId: string;
    bloodGroup: string;
    alzheimerStage: AlzheimerStage | '';
    allergies: string;
    chronicDiseases: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  } {
    return {
      patientId: record.patientId,
      bloodGroup: record.bloodGroup ?? '',
      alzheimerStage: record.alzheimerStage ?? '',
      allergies: record.allergies ?? '',
      chronicDiseases: record.chronicDiseases ?? '',
      emergencyContactName: record.emergencyContactName ?? '',
      emergencyContactPhone: record.emergencyContactPhone ?? '',
    };
  }

  private toNullable(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private extractError(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return 'Unable to save medical record.';
  }

  private updateStageEditPermission(): void {
    if (this.currentRole === 'CAREGIVER') {
      this.form.controls.alzheimerStage.disable();
      return;
    }

    if (this.form.controls.alzheimerStage.disabled) {
      this.form.controls.alzheimerStage.enable();
    }
  }

  private prefillPatientForOwnRecord(user: User | null): void {
    if (this.isEditMode || this.currentRole !== 'PATIENT') {
      return;
    }

    const patientId = this.resolveOwnPatientId(user);
    if (patientId) {
      this.form.controls.patientId.setValue(patientId);
      this.form.controls.patientId.disable();
    }
  }

  private isOwnRecord(record: MedicalRecord): boolean {
    const ownIds = this.uniqueNormalized([
      this.resolveOwnPatientId(this.currentUser),
      this.currentUser?.email || '',
      this.currentUser?.name || ''
    ]);
    const recordPatientId = record.patientId.trim().toLowerCase();
    return ownIds.some((id) => id.toLowerCase() === recordPatientId);
  }

  private resolveOwnPatientId(user: User | null): string {
    if (user?.userId && user.userId.trim()) {
      return user.userId.trim();
    }

    if (typeof window !== 'undefined') {
      const localPatientId = window.localStorage.getItem('patientId');
      if (localPatientId && localPatientId.trim()) {
        return localPatientId.trim();
      }
    }

    return user?.email?.trim() || '';
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
}
