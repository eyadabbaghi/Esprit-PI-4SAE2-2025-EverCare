import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { AlzheimerStage, CreateMedicalRecordRequest, MedicalRecord, UpdateMedicalRecordRequest } from '../../models/medical-record.model';
import { MedicalRecordService } from '../../services/medical-record.service';
import { getMedicalRecordPermissions, MedicalRecordPermissions, resolveRole } from '../../utils/medical-record-permissions';
import { NotificationService } from '../../../../core/services/notification.service';

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
  caregiverTargetPatientId = '';
  caregiverTargetPatientEmail = '';
  caregiverTargetPatientName = '';
  associatedPatients: User[] = [];
  patientSuggestions: User[] = [];
  selectedPatient: User | null = null;
  isLookingUpPatients = false;

  constructor(
    private readonly authService: AuthService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly notificationService: NotificationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.currentRole = resolveRole(user?.role);
      this.permissions = getMedicalRecordPermissions(this.currentRole);
      this.updateStageEditPermission();
      this.prefillCaregiverPatientRecord(user);
      this.prefillPatientForOwnRecord(user);
      this.loadDoctorAssociatedPatients(user);
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

        if (this.currentRole === 'CAREGIVER' && record.patientId !== this.caregiverTargetPatientId) {
          this.errorMessage = 'Open this patient from your caregiver profile before editing their medical record.';
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

    const raw = this.form.getRawValue();
    if (this.currentRole === 'CAREGIVER' && !this.canCaregiverFillPatient(raw.patientId)) {
      this.errorMessage = 'Choose one of your associated patients from your profile before editing their medical record.';
      return;
    }

    if (!this.isEditMode && this.currentRole === 'DOCTOR' && !this.selectedPatient) {
      this.errorMessage = 'Select one of your associated patients from the list.';
      this.form.controls.patientId.markAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

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
      patientId: this.resolveCreatePatientId(raw.patientId),
      ...updatePayload
    };

    const create$ = this.useAutoCreate
      ? this.medicalRecordService.autoCreate(createPayload)
      : this.medicalRecordService.create(createPayload);

    create$.subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.notifyDoctorOfCreatedMedicalRecord(created);
        this.notifyPatientCareTeamOfCreatedMedicalRecord(created);
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

  onPatientSearchChange(value: string): void {
    if (this.currentRole !== 'DOCTOR' || this.isEditMode) {
      return;
    }

    const query = value.trim().toLowerCase();
    if (this.selectedPatient && this.formatPatientLabel(this.selectedPatient).toLowerCase() !== query) {
      this.selectedPatient = null;
    }

    if (!query) {
      this.patientSuggestions = [];
      return;
    }

    this.patientSuggestions = this.associatedPatients
      .filter((patient) => {
        const name = String(patient.name || '').toLowerCase();
        const email = String(patient.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      })
      .slice(0, 6);
  }

  selectAssociatedPatient(patient: User): void {
    this.selectedPatient = patient;
    this.patientSuggestions = [];
    this.form.controls.patientId.setValue(this.formatPatientLabel(patient));
  }

  formatPatientLabel(patient: User): string {
    return patient.name || patient.email || 'Associated patient';
  }

  trackPatient(_: number, patient: User): string {
    return patient.userId || patient.email || patient.name;
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

  private notifyDoctorOfCreatedMedicalRecord(record: MedicalRecord): void {
    const patientEmail = this.resolveRecordPatientEmail();
    const patientName = this.resolveRecordPatientName();

    const sendToDoctor = (patient: User | null) => {
      const doctorEmails = this.uniqueNormalized([
        patient?.doctorEmail || '',
        ...(patient?.doctorEmails || []),
        ...(this.currentRole === 'PATIENT' ? [
          this.currentUser?.doctorEmail || '',
          ...(this.currentUser?.doctorEmails || [])
        ] : [])
      ]);
      if (!doctorEmails.length) return;

      doctorEmails.forEach(doctorEmail => this.authService.getUserByEmail(doctorEmail).subscribe({
        next: (doctor) => {
          const targetId = doctor.userId || doctor.email;
          if (!targetId) return;
          this.notificationService.sendNotification({
            activityId: `medical-record-created:${record.id}`,
            action: 'MEDICAL_RECORD_CREATED',
            details: JSON.stringify({
              message: `A new medical record was added for ${patientName}.`,
              patientId: record.patientId,
              patientName,
              patientEmail,
              recordId: record.id,
            }),
            targetUserIds: [targetId],
          }).subscribe({ error: () => undefined });
        },
        error: () => undefined,
      }));
    };

    if (this.currentRole === 'PATIENT') {
      sendToDoctor(this.currentUser);
      return;
    }

    if (patientEmail) {
      this.authService.getUserByEmail(patientEmail).subscribe({
        next: (patient) => sendToDoctor(patient),
        error: () => undefined,
      });
    }
  }

  private notifyPatientCareTeamOfCreatedMedicalRecord(record: MedicalRecord): void {
    if (this.currentRole !== 'DOCTOR' || !this.selectedPatient) {
      return;
    }

    const patient = this.selectedPatient;
    const targetUserIds = this.uniqueNormalized([
      patient.userId || '',
      ...(patient.caregiverEmails || [])
    ]);

    if (targetUserIds.length === 0) {
      return;
    }

    this.notificationService.sendNotification({
      activityId: `medical-record-doctor-created:${record.id}`,
      action: 'MEDICAL_RECORD_CREATED',
      details: JSON.stringify({
        message: `${this.currentUser?.name || 'Your doctor'} added a medical record for ${patient.name || 'the patient'}.`,
        patientId: record.patientId,
        patientName: patient.name,
        patientEmail: patient.email,
        doctorName: this.currentUser?.name,
        recordId: record.id,
      }),
      targetUserIds,
    }).subscribe({ error: () => undefined });
  }

  private resolveRecordPatientEmail(): string {
    if (this.currentRole === 'CAREGIVER') return this.caregiverTargetPatientEmail;
    return this.currentUser?.email || '';
  }

  private resolveRecordPatientName(): string {
    if (this.currentRole === 'DOCTOR' && this.selectedPatient) {
      return this.selectedPatient.name || this.selectedPatient.email || 'your patient';
    }
    if (this.currentRole === 'CAREGIVER') {
      return this.caregiverTargetPatientName || this.caregiverTargetPatientEmail || 'your patient';
    }
    return this.currentUser?.name || this.currentUser?.email || 'your patient';
  }

  private resolveCreatePatientId(formPatientId: string): string {
    if (this.currentRole === 'DOCTOR' && this.selectedPatient) {
      return this.selectedPatient.userId || this.selectedPatient.keycloakId || this.selectedPatient.email || formPatientId.trim();
    }

    return formPatientId.trim();
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

  private prefillCaregiverPatientRecord(user: User | null): void {
    if (this.isEditMode || this.currentRole !== 'CAREGIVER') {
      return;
    }

    const targetPatientId = this.route.snapshot.queryParamMap.get('patientId')?.trim() || '';
    const targetPatientEmail = this.route.snapshot.queryParamMap.get('patientEmail')?.trim() || '';
    const targetPatientName = this.route.snapshot.queryParamMap.get('patientName')?.trim() || '';

    if (!targetPatientId) {
      return;
    }

    if (!this.isAssociatedPatientEmail(user, targetPatientEmail)) {
      this.errorMessage = 'This patient is not associated with your caregiver profile.';
      this.form.controls.patientId.disable();
      return;
    }

    if (this.caregiverTargetPatientId === targetPatientId) {
      return;
    }

    this.caregiverTargetPatientId = targetPatientId;
    this.caregiverTargetPatientEmail = targetPatientEmail;
    this.caregiverTargetPatientName = targetPatientName;
    this.form.controls.patientId.setValue(targetPatientId);
    this.form.controls.patientId.disable();
    this.loadExistingCaregiverTargetRecord(targetPatientId);
  }

  private loadDoctorAssociatedPatients(user: User | null): void {
    if (this.currentRole !== 'DOCTOR' || this.isEditMode || !user) {
      return;
    }

    const doctorEmail = String(user.email || '').trim().toLowerCase();
    const directEmails = this.uniqueNormalized(user.patientEmails || []);
    const directRequests = directEmails.map((email) =>
      this.authService.getUserByEmail(email).pipe(catchError(() => of(null)))
    );

    this.isLookingUpPatients = true;
    forkJoin({
      direct: directRequests.length ? forkJoin(directRequests) : of([]),
      fallback: this.authService.searchUsersByRole('', 'PATIENT').pipe(catchError(() => of([]))),
    }).pipe(
      map(({ direct, fallback }) => {
        const patients = new Map<string, User>();
        for (const patient of direct) {
          if (patient) {
            patients.set(this.userKey(patient), patient);
          }
        }
        for (const patient of fallback || []) {
          const doctorEmails = this.uniqueNormalized([
            patient.doctorEmail || '',
            ...(patient.doctorEmails || [])
          ]);
          if (doctorEmails.includes(doctorEmail)) {
            patients.set(this.userKey(patient), patient);
          }
        }
        return Array.from(patients.values());
      })
    ).subscribe({
      next: (patients) => {
        this.associatedPatients = patients;
        this.isLookingUpPatients = false;
      },
      error: () => {
        this.associatedPatients = [];
        this.isLookingUpPatients = false;
      }
    });
  }

  private loadExistingCaregiverTargetRecord(patientId: string): void {
    this.isLoading = true;
    this.medicalRecordService.getByPatientId(patientId).subscribe({
      next: (record) => {
        this.isEditMode = true;
        this.recordId = record.id;
        this.form.patchValue(this.toForm(record));
        this.form.controls.patientId.disable();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private canCaregiverFillPatient(patientId: string): boolean {
    if (this.currentRole !== 'CAREGIVER') {
      return true;
    }

    const requestedId = patientId.trim();
    return !!this.caregiverTargetPatientId && requestedId === this.caregiverTargetPatientId;
  }

  private isAssociatedPatientEmail(user: User | null, patientEmail: string): boolean {
    const normalizedEmail = patientEmail.trim().toLowerCase();
    if (!user || !normalizedEmail) {
      return false;
    }

    return (user.patientEmails || []).some((email) => email.trim().toLowerCase() === normalizedEmail);
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

  private userKey(user: User): string {
    return String(user.userId || user.email || user.name || '').trim().toLowerCase();
  }
}
