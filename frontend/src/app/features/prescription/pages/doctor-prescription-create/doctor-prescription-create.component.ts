import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { PrescriptionRequest } from '../../models/prescription.model';
import { PrescriptionService, ClinicalMeasurementResponse, SafetyCheckResult } from '../../services/prescription.service';

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
    });
  }

  loadClinicalMeasurement(): void {
    if (this.appointmentId) {
      this.prescriptionService.getClinicalMeasurementByAppointment(this.appointmentId).subscribe({
        next: (data) => {
          this.clinicalMeasurement = data;
        },
        error: () => {
          // No clinical measurement found, try latest for patient
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
    if (this.safetyWarning && this.safetyWarning.level === 'CRITICAL' && !this.overrideJustification.trim()) {
      this.loading = false;
      this.showCriticalWarning = true;
      this.errorMessage = 'CRITICAL safety issue. Override justification is required.';
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
}
