import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Severity, IncidentType } from '../core/model/alerts.models';
import { Patient } from '../core/services/user.service';
import { AuthService, User } from '../features/front-office/pages/login/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-add-incident-dialog',
  templateUrl: './add-incident-dialog.component.html',
  styleUrls: ['./add-incident-dialog.component.css'] // updated with ::ng-deep styles
})
export class AddIncidentDialogComponent implements OnInit, OnDestroy {

  step: 'details' | 'review' = 'details';
  form: FormGroup;

  patients: Patient[] = [];
  aiSuggestion: string | null = null;
  showAISuggestion = false;

  currentUser: User | null = null;
  userRole: string | null = null;

  private userSub?: Subscription;

  severityOptions: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  typeOptions: IncidentType[] = ['Medical', 'Behavioral', 'Safety'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddIncidentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { incident?: any; allowedPatients?: Patient[] },
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      type: ['Medical', Validators.required],
      severity: ['MEDIUM', Validators.required],
      description: ['', Validators.required],
      patientId: ['', Validators.required],
      location: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Load patients list
    this.patients = this.data.allowedPatients ?? [];

    // Edit mode: patch form
    if (this.data.incident) {
      this.form.patchValue(this.data.incident);
    }

    // Subscribe to form changes for AI suggestion
    this.form.valueChanges.subscribe(() => this.generateAISuggestion());

    // Subscribe to current user
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.userRole = user?.role?.toLowerCase() ?? null;

      const patientCtrl = this.form.get('patientId');

      if (this.userRole === 'patient' && user?.userId) {
        // If patient, auto-fill patientId and disable control
        patientCtrl?.setValue(user.userId);
        patientCtrl?.clearValidators();
        patientCtrl?.disable({ emitEvent: false });
        patientCtrl?.updateValueAndValidity({ emitEvent: false });
      } else {
        // Enable and require selection for other roles
        patientCtrl?.setValidators(Validators.required);
        patientCtrl?.enable({ emitEvent: false });
        patientCtrl?.updateValueAndValidity({ emitEvent: false });
      }

      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  /* ---------- AI suggestion logic ---------- */
  generateAISuggestion(): void {
    const title = this.form.get('title')?.value;
    const desc = this.form.get('description')?.value;

    if (title?.length > 10 && desc?.length > 20) {
      this.showAISuggestion = true;

      if (title.toLowerCase().includes('fall')) {
        this.aiSuggestion =
          'This is a critical safety incident. Consider CRITICAL severity and immediate notification.';
      } else if (title.toLowerCase().includes('medication')) {
        this.aiSuggestion =
          'Missed medication detected. HIGH severity recommended. Notify the doctor.';
      } else {
        this.aiSuggestion =
          'Based on the description, monitor closely and notify the care team.';
      }
    } else {
      this.showAISuggestion = false;
      this.aiSuggestion = null;
    }
  }

  applyAISuggestion(): void {
    if (!this.aiSuggestion) return;

    if (this.aiSuggestion.includes('CRITICAL')) {
      this.form.patchValue({ severity: 'CRITICAL' });
    } else if (this.aiSuggestion.includes('HIGH')) {
      this.form.patchValue({ severity: 'HIGH' });
    }
  }

  /* ---------- Step navigation ---------- */
  nextStep(): void {
    if (this.form.valid) {
      this.step = 'review';
    }
  }

  previousStep(): void {
    this.step = 'details';
  }

  /* ---------- Helpers ---------- */
  getPatientName(patientId: string): string {
    if (this.userRole === 'patient') {
      return this.currentUser?.name ?? 'Unknown';
    }
    const patient = this.patients.find(p => p.userId === patientId);
    return patient ? patient.name : 'Unknown';
  }

  /* ---------- Save / Cancel ---------- */
 save(): void {
  if (!this.form.valid) return;

  const payload = {
    ...this.form.getRawValue(), // include disabled patientId
    reportedByUserId: this.currentUser?.userId ?? 'unknown',
    incidentDate: new Date()
  };

  console.log('Incident dialog payload:', payload); // <-- ADD THIS
  this.dialogRef.close(payload);
}
  cancel(): void {
    this.dialogRef.close();
  }
}