import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { PrescriptionService } from '../../services/prescription.service';

import { Prescription } from '../../models/prescription.model';
import { CaregiverPatientService } from '../../../appointments/services/patient-caregiver-relation.service';
@Component({
  selector: 'app-caregiver-prescription-page',
  templateUrl: './caregiver-prescription-page.component.html'
})
export class CaregiverPrescriptionPageComponent implements OnInit {

  currentUser: User | null = null;
  patient: User | null = null;

  activePrescriptions: Prescription[] = [];
  pastPrescriptions: Prescription[] = [];
  todayPrescriptions: Prescription[] = [];

  selectedPrescription: Prescription | null = null;
  activeTab: 'active' | 'today' | 'history' = 'active';

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private prescriptionService: PrescriptionService,
    private patientCaregiverService: CaregiverPatientService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      if (user.role !== 'CAREGIVER') {
        this.toastr.error('Access denied.');
        this.router.navigate(['/prescriptions']);
        return;
      }
      this.currentUser = user;
      this.loadPatient();
    });
  }

  loadPatient(): void {
    if (!this.currentUser?.userId) return;
    this.loading = true;

    this.patientCaregiverService.getPatientsByCaregiverId(this.currentUser.userId)
      .subscribe({
        next: (patients) => {
          if (patients && patients.length > 0) {
            this.patient = patients[0];
            this.loadPrescriptions();
          } else {
            this.errorMessage = 'No patient assigned to you.';
            this.loading = false;
          }
        },
        error: (err) => {
          if (err.status === 401) {
            this.router.navigate(['/login']);
          } else {
            this.errorMessage = 'Failed to load patient information.';
          }
          this.loading = false;
        }
      });
  }

  loadPrescriptions(): void {
    if (!this.patient?.userId) return;

    this.prescriptionService.getPrescriptionsByPatient(this.patient.userId)
      .subscribe({
        next: (data) => {
          this.activePrescriptions = data.filter(p => p.statut === 'ACTIVE');
          this.pastPrescriptions   = data.filter(p => p.statut !== 'ACTIVE');
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load prescriptions.';
          this.loading = false;
        }
      });

    this.prescriptionService.getTodayPrescriptions(this.patient.userId)
      .subscribe({
        next: (data) => { this.todayPrescriptions = data; },
        error: () => {}
      });
  }

  getPatientAge(): number {
    if (!this.patient?.dateOfBirth) return 0;
    const birth = new Date(this.patient.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  viewPrescription(p: Prescription): void { this.selectedPrescription = p; }
  closeDetails(): void { this.selectedPrescription = null; }
}
