import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Severity, IncidentType } from '../core/model/alerts.models';
import { Patient } from '../core/services/user.service';
import { AlertsService } from '../core/services/alerts.service';
import { AuthService, User } from '../features/front-office/pages/login/auth.service';
import { of, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';

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
  aiInsightLoading = false;
  aiInsightError: string | null = null;
  aiInsightLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  currentUser: User | null = null;
  userRole: string | null = null;

  private userSub?: Subscription;
  private formSub?: Subscription;

  severityOptions: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  typeOptions: IncidentType[] = ['Medical', 'Behavioral', 'Safety'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddIncidentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { incident?: any; allowedPatients?: Patient[] },
    private authService: AuthService,
    private alertsService: AlertsService,
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
      this.aiSuggestion = this.data.incident.aiSuggestion || null;
      this.showAISuggestion = !!this.aiSuggestion;
    }

    // Generate AI insights from the backend model once the report has enough context.
    this.formSub = this.form.valueChanges.pipe(
      debounceTime(900),
      map(() => this.buildAiPayload()),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      tap(payload => {
        if (!this.canGenerateInsight(payload)) {
          this.aiInsightLoading = false;
          this.showAISuggestion = false;
          this.aiSuggestion = null;
          this.aiInsightError = null;
        }
      }),
      switchMap(payload => {
        if (!this.canGenerateInsight(payload)) {
          return of(null);
        }

        this.showAISuggestion = true;
        this.aiInsightLoading = true;
        this.aiInsightError = null;

        return this.alertsService.generateIncidentInsights(payload).pipe(
          catchError((error) => {
            this.aiInsightError = this.getAiErrorMessage(error);
            return of(null);
          })
        );
      })
    ).subscribe(response => {
      this.aiInsightLoading = false;

      if (response?.aiSuggestion) {
        this.aiSuggestion = response.aiSuggestion;
        this.updateAiInsightLevelFromText(response.aiSuggestion);
      }

      this.cdr.detectChanges();
    });

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
    this.formSub?.unsubscribe();
  }

  /* ---------- AI suggestion logic ---------- */
  generateAISuggestion(): void {
    const payload = this.buildAiPayload();
    if (!this.canGenerateInsight(payload)) return;

    this.aiInsightLoading = true;
    this.showAISuggestion = true;
    this.alertsService.generateIncidentInsights(payload).subscribe({
      next: (response) => {
        this.aiSuggestion = response.aiSuggestion;
        this.updateAiInsightLevelFromText(response.aiSuggestion);
        this.aiInsightLoading = false;
      },
      error: (error) => {
        this.aiInsightError = this.getAiErrorMessage(error);
        this.aiInsightLoading = false;
      }
    });
  }

  applyAISuggestion(): void {
    if (!this.aiSuggestion) return;

    if (this.aiInsightLevel === 'critical') {
      this.form.patchValue({ severity: 'CRITICAL' });
    } else if (this.aiInsightLevel === 'high') {
      this.form.patchValue({ severity: 'HIGH' });
    } else if (this.aiInsightLevel === 'low') {
      this.form.patchValue({ severity: 'LOW' });
    } else {
      this.form.patchValue({ severity: 'MEDIUM' });
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
    aiSuggestion: this.aiSuggestion,
    reportedByUserId: this.currentUser?.userId ?? 'unknown',
    incidentDate: new Date()
  };

  console.log('Incident dialog payload:', payload); // <-- ADD THIS
  this.dialogRef.close(payload);
}
  cancel(): void {
    this.dialogRef.close();
  }

  private buildAiPayload(): { title: string; type: string; description: string; severity: string; location: string } {
    return {
      title: String(this.form.get('title')?.value || '').trim(),
      type: String(this.form.get('type')?.value || 'Medical').trim(),
      description: String(this.form.get('description')?.value || '').trim(),
      severity: String(this.form.get('severity')?.value || 'MEDIUM').trim(),
      location: String(this.form.get('location')?.value || '').trim()
    };
  }

  private canGenerateInsight(payload: { title: string; description: string }): boolean {
    return payload.title.length > 5 && payload.description.length > 15;
  }

  private updateAiInsightLevelFromText(insight: string): void {
    const match = insight.match(/Recommended severity:\s*(LOW|MEDIUM|HIGH|CRITICAL)/i);
    this.aiInsightLevel = (match?.[1]?.toLowerCase() as 'low' | 'medium' | 'high' | 'critical') || 'medium';
  }

  private getAiErrorMessage(error: any): string {
    return error?.error?.message || 'AI insights are temporarily unavailable. You can still report the incident.';
  }

  private buildIncidentInsights(title: string, desc: string, severity: string, type: string, text: string): string {
    const immediate: string[] = [];
    const prevention: string[] = [];
    const followUp: string[] = [];
    let recommendedSeverity = severity;

    if (this.hasAny(text, ['fall', 'fell', 'slip', 'tripped', 'head hit', 'hit head'])) {
      recommendedSeverity = this.raiseSeverity(recommendedSeverity, 'HIGH');
      immediate.push('Check for pain, dizziness, bleeding, confusion, or reduced mobility before moving the patient.');
      immediate.push('Keep the area calm and notify the caregiver or doctor if there was head impact or repeated falling.');
      prevention.push('Remove floor clutter, improve lighting, check footwear, and review walking aids or bathroom safety rails.');
      followUp.push('Document where the fall happened and whether the patient was alone, dizzy, or rushing.');
    }

    if (this.hasAny(text, ['medication', 'medicine', 'dose', 'pill', 'missed', 'overdose', 'wrong medication'])) {
      recommendedSeverity = this.raiseSeverity(recommendedSeverity, 'HIGH');
      immediate.push('Confirm which medication and dose were involved, then contact the doctor or pharmacist before giving extra doses.');
      prevention.push('Use a medication schedule, labeled organizer, and reminder alert for the next doses.');
      followUp.push('Record the medication name, dose, time, and any symptoms after the incident.');
    }

    if (this.hasAny(text, ['chest pain', 'breathing', 'breath', 'unconscious', 'seizure', 'stroke', 'bleeding', 'emergency'])) {
      recommendedSeverity = 'CRITICAL';
      immediate.push('Treat this as urgent: contact emergency care if symptoms are active, worsening, or unusual for the patient.');
      prevention.push('Keep emergency contacts visible and review the patient emergency plan with caregivers.');
      followUp.push('Share symptoms, timing, medications, and vital signs with the clinical team.');
    }

    if (this.hasAny(text, ['confused', 'wandering', 'agitated', 'aggression', 'memory', 'lost'])) {
      recommendedSeverity = this.raiseSeverity(recommendedSeverity, 'HIGH');
      immediate.push('Reduce stimulation, speak calmly, and guide the patient to a familiar safe place.');
      prevention.push('Identify triggers, keep routines consistent, and use tracking/safe-zone alerts when wandering risk is present.');
      followUp.push('Note the time of day, location, trigger, and what helped the patient settle.');
    }

    if (this.hasAny(text, ['dizzy', 'weak', 'fever', 'vomit', 'pain', 'not eating', 'dehydrated'])) {
      recommendedSeverity = this.raiseSeverity(recommendedSeverity, 'MEDIUM');
      immediate.push('Monitor symptoms closely, encourage safe hydration if appropriate, and check vital signs if available.');
      prevention.push('Track patterns in meals, hydration, medication timing, sleep, and recent illness.');
      followUp.push('Contact a clinician if symptoms persist, worsen, or repeat.');
    }

    if (!immediate.length) {
      immediate.push('Check the patient calmly, confirm they are safe, and notify the appropriate caregiver or doctor if risk remains.');
      prevention.push('Look for patterns in time, location, activity, medication, and environment to reduce repeat incidents.');
      followUp.push('Add a clear alert, monitor for changes, and document any action already taken.');
    }

    this.aiInsightLevel = recommendedSeverity.toLowerCase() as 'low' | 'medium' | 'high' | 'critical';

    return [
      `Recommended severity: ${recommendedSeverity}.`,
      `What to do now: ${immediate.join(' ')}`,
      `Prevention: ${prevention.join(' ')}`,
      `Follow-up notes: ${followUp.join(' ')}`
    ].join('\n\n');
  }

  private hasAny(text: string, terms: string[]): boolean {
    return terms.some(term => text.includes(term));
  }

  private raiseSeverity(current: string, target: string): string {
    const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return order.indexOf(target) > order.indexOf(current) ? target : current;
  }
}
