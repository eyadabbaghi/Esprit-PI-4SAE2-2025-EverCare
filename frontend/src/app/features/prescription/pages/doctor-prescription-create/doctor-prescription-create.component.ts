import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { PrescriptionRequest } from '../../models/prescription.model';
import { PrescriptionService, ClinicalMeasurementResponse, SafetyCheckResult, SafetyCheckResponse } from '../../services/prescription.service';

@Component({
  selector: 'app-doctor-prescription-create',
  templateUrl: './doctor-prescription-create.component.html',
  styleUrls: ['./doctor-prescription-create.component.css']
})
export class DoctorPrescriptionCreateComponent implements OnInit {
  currentUser: User | null = null;
  patientId = '';
  appointmentId = '';
  loading = false;
  errorMessage = '';
  associatedPatients: User[] = [];
  patientsLoading = false;

  clinicalMeasurement: ClinicalMeasurementResponse | null = null;
  safetyWarning: SafetyCheckResult | null = null;
  overrideJustification = '';
  showCriticalWarning = false;
  patientActiveMedications: any[] = [];

  // Check Safety state
  checkLoading = false;
  checkPassed = false;
  checkDone = false;
  lastCheckedRequest: PrescriptionRequest | null = null;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private prescriptionService: PrescriptionService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.patientId = params.get('patientId') || '';
      this.appointmentId = params.get('appointmentId') || '';
      if (this.currentUser) {
        this.refreshPatientContext();
      }
    });

    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      if (user.role !== 'DOCTOR') {
        this.toastr.error('Access denied.');
        this.router.navigate(['/prescriptions']);
        return;
      }

      this.currentUser = user;
      this.loadAssociatedPatients();
      this.refreshPatientContext();
    });
  }

  loadAssociatedPatients(): void {
    if (!this.currentUser?.email) {
      this.associatedPatients = [];
      return;
    }

    const patientEmails = this.currentUser.patientEmails || [];
    this.patientsLoading = true;

    if (patientEmails.length > 0) {
      forkJoin(
        patientEmails.map(email =>
          this.authService.getUserByEmail(email).pipe(catchError(() => of(null)))
        )
      ).subscribe({
        next: patients => {
          this.associatedPatients = patients
            .filter((patient): patient is User => !!patient && (patient.role || '').toUpperCase() === 'PATIENT');
          this.patientsLoading = false;
        },
        error: () => {
          this.associatedPatients = [];
          this.patientsLoading = false;
        }
      });
      return;
    }

    this.authService.searchUsersByRole('', 'PATIENT').pipe(
      catchError(() => of([] as User[]))
    ).subscribe(patients => {
      this.associatedPatients = patients.filter(patient =>
        this.isDoctorAssociatedPatient(patient)
      );
      this.patientsLoading = false;
    });
  }

  private isDoctorAssociatedPatient(patient: User): boolean {
    const currentEmail = (this.currentUser?.email || '').toLowerCase().trim();
    return [
      patient.doctorEmail,
      ...(patient.doctorEmails || [])
    ]
      .map(email => (email || '').toLowerCase().trim())
      .filter(Boolean)
      .includes(currentEmail);
  }

  selectPatientForPrescription(patient: User): void {
    if (!patient.userId) {
      this.toastr.warning('This patient profile is missing an ID.');
      return;
    }

    this.patientId = patient.userId;
    this.appointmentId = '';
    this.checkDone = false;
    this.checkPassed = false;
    this.safetyWarning = null;
    this.errorMessage = '';
    this.router.navigate(['/prescriptions/doctor/prescribe', patient.userId], { replaceUrl: true });
    this.refreshPatientContext();
  }

  isSelectedPatient(patient: User): boolean {
    return !!patient.userId && patient.userId === this.patientId;
  }

  private refreshPatientContext(): void {
    this.clinicalMeasurement = null;
    this.patientActiveMedications = [];
    this.loadClinicalMeasurement();
    this.loadPatientActiveMedications();
  }

  loadClinicalMeasurement(): void {
    if (this.appointmentId) {
      this.prescriptionService.getClinicalMeasurementByAppointment(this.appointmentId).subscribe({
        next: (data) => {
          this.clinicalMeasurement = data;
        },
        error: () => {
          if (this.patientId) {
            this.prescriptionService.getLatestClinicalMeasurement(this.patientId).subscribe({
              next: (data) => this.clinicalMeasurement = data,
              error: () => {}
            });
          }
        }
      });
    } else if (this.patientId) {
      this.prescriptionService.getLatestClinicalMeasurement(this.patientId).subscribe({
        next: (data) => this.clinicalMeasurement = data,
        error: () => {}
      });
    }
  }

  loadPatientActiveMedications(): void {
    if (this.patientId && this.currentUser?.userId) {
      this.prescriptionService.getPrescriptionsByDoctor(this.currentUser.userId).subscribe({
        next: (data) => {
          this.patientActiveMedications = (data || []).filter((prescription) =>
            prescription.statut === 'ACTIVE' && prescription.patient?.userId === this.patientId,
          );
        },
        error: () => {
          this.patientActiveMedications = [];
        }
      });
    }
  }

  clearMedicationAndGoBack(): void {
    this.safetyWarning = null;
    this.overrideJustification = '';
    this.showCriticalWarning = false;
  }

  resetForm(): void {
    this.errorMessage = '';
    this.safetyWarning = null;
    this.overrideJustification = '';
    this.showCriticalWarning = false;
  }

  submit(request: PrescriptionRequest): void {
    this.loading = true;
    this.errorMessage = '';

    if (request.appointmentId) {
      this.prescriptionService.getClinicalMeasurementByAppointment(request.appointmentId).subscribe({
        next: (measurement) => {
          this.clinicalMeasurement = measurement;
          this.createPrescriptionWithSafetyCheck(request);
        },
        error: () => {
          this.prescriptionService.getLatestClinicalMeasurement(request.patientId).subscribe({
            next: (measurement) => {
              this.clinicalMeasurement = measurement;
              this.createPrescriptionWithSafetyCheck(request);
            },
            error: () => this.createPrescriptionWithSafetyCheck(request)
          });
        }
      });
    } else {
      this.createPrescriptionWithSafetyCheck(request);
    }
  }

  createPrescriptionWithSafetyCheck(request: PrescriptionRequest): void {
    if (this.clinicalMeasurement && !this.checkDone) {
      this.runSafetyCheck(request, () => this.createPrescriptionWithSafetyCheck(request));
      return;
    }

    const requestWithOverride: PrescriptionRequest = {
      ...request,
      overrideJustification: this.overrideJustification || undefined
    };

    this.prescriptionService.createPrescription(requestWithOverride).subscribe({
      next: () => {
        this.loading = false;
        this.toastr.success('Prescription issued successfully.');
        this.router.navigate(['/prescriptions/doctor/manage']);
      },
      error: (error) => {
        this.loading = false;
        const errorData = error?.error;
        if (errorData?.safetyWarning) {
          this.safetyWarning = errorData.safetyWarning;
          if (this.safetyWarning?.level === 'CRITICAL') {
            this.showCriticalWarning = true;
          }
          this.errorMessage = errorData.error || errorData.safetyWarning.message || 'Safety check failed.';
        } else {
          this.errorMessage = error?.error?.message || 'Failed to issue prescription.';
        }
      }
    });
  }

  onSafetyWarningReceived(warning: SafetyCheckResult): void {
    this.safetyWarning = warning;
    if (warning?.level === 'CRITICAL') {
      this.showCriticalWarning = true;
    }
  }

  goBack(): void {
    if (this.appointmentId) {
      this.router.navigate(['/appointments/doctor']);
      return;
    }

    this.router.navigate(['/prescriptions/doctor/manage']);
  }

  // Handle Check Safety event from form
  onCheckSafety(request: PrescriptionRequest): void {
    this.runSafetyCheck(request);
  }

  private runSafetyCheck(request: PrescriptionRequest, afterCheck?: () => void): void {
    this.checkLoading = true;
    this.checkPassed = false;
    this.checkDone = false;
    this.safetyWarning = null;
    this.showCriticalWarning = false;
    this.errorMessage = '';
    this.lastCheckedRequest = request;

    this.prescriptionService.checkPrescriptionSafety(request).subscribe({
      next: (result) => {
        this.checkLoading = false;
        this.checkDone = true;
        this.lastCheckedRequest = request;

        // Always allow submission - just show warnings as alerts
        this.checkPassed = true;
        
          if (result.level === 'SAFE') {
            this.safetyWarning = null;
            this.toastr.success('Safety check passed.');
          } else {
          // Show warnings but don't block
          this.safetyWarning = {
            isSafe: false,
            level: result.level === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
            message: result.message,
            warnings: result.warnings
          };
          if (result.level === 'WARNING') {
            this.toastr.warning('Warnings detected. Doctor is aware.', 'Safety Alert');
          } else if (result.level === 'CRITICAL') {
            this.toastr.error('Critical alerts - doctor is aware.', 'Safety Alert');
          }
          }

          afterCheck?.();
        },
      error: (err) => {
        this.checkLoading = false;
        this.checkDone = false;
        this.loading = false;
        this.errorMessage = 'Safety check failed. Please try again.';
        this.toastr.error('Safety check failed. Please try again.');
      }
    });
  }
}
