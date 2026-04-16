import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { PrescriptionRequest } from '../../models/prescription.model';
import { PrescriptionService, ClinicalMeasurementResponse, SafetyCheckResult, SafetyCheckResponse } from '../../services/prescription.service';

@Component({
  selector: 'app-doctor-prescription-create',
  templateUrl: './doctor-prescription-create.component.html'
})
export class DoctorPrescriptionCreateComponent implements OnInit {
  currentUser: User | null = null;
  patientId = '';
  appointmentId = '';
  loading = false;
  errorMessage = '';

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
      this.loadClinicalMeasurement();
      this.loadPatientActiveMedications();
    });
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
    if (this.patientId) {
      this.prescriptionService.getActivePrescriptionsByPatient(this.patientId).subscribe({
        next: (data) => {
          this.patientActiveMedications = data;
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
    // Require safety check first if clinical measurement exists (to ensure doctor reviewed the data)
    if (this.clinicalMeasurement && !this.checkDone) {
      this.loading = false;
      this.errorMessage = 'Please click "Check Safety" first to review alerts.';
      this.toastr.warning('Please check safety first to review alerts.');
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
      },
      error: (err) => {
        this.checkLoading = false;
        this.checkDone = false;
        this.errorMessage = 'Safety check failed. Please try again.';
        this.toastr.error('Safety check failed. Please try again.');
      }
    });
  }
}
