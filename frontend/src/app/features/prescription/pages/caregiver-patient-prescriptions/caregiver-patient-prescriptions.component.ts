import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { CaregiverPatientService } from '../../../appointments/services/patient-caregiver-relation.service';
import { Prescription } from '../../models/prescription.model';
import { PrescriptionService } from '../../services/prescription.service';

@Component({
  selector: 'app-caregiver-patient-prescriptions',
  templateUrl: './caregiver-patient-prescriptions.component.html'
})
export class CaregiverPatientPrescriptionsComponent implements OnInit {
  currentUser: User | null = null;
  linkedPatients: User[] = [];
  selectedPatient: User | null = null;
  selectedPrescription: Prescription | null = null;

  activePrescriptions: Prescription[] = [];
  historyPrescriptions: Prescription[] = [];
  todayPrescriptions: Prescription[] = [];
  activeSection: 'active' | 'today' | 'history' = 'active';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private caregiverPatientService: CaregiverPatientService,
    private prescriptionService: PrescriptionService,
    private route: ActivatedRoute,
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
      this.route.url.subscribe(() => this.applyRouteState());
      this.route.paramMap.subscribe(() => this.applyRouteState());
      this.loadLinkedPatients();
    });
  }

  loadLinkedPatients(): void {
    if (!this.currentUser?.userId) return;
    this.loading = true;
    this.caregiverPatientService.getPatientsByCaregiverId(this.currentUser.userId).subscribe({
      next: patients => {
        this.linkedPatients = patients;
        const routePatientId = this.route.snapshot.paramMap.get('patientId');
        this.selectedPatient = patients.find(item => item.userId === routePatientId) || patients[0] || null;
        if (this.selectedPatient) {
          if (!routePatientId) {
            this.router.navigate(['/prescriptions/caregiver/patient', this.selectedPatient.userId], { replaceUrl: true });
          }
          this.loadPrescriptions();
        } else {
          this.errorMessage = 'No linked patient found.';
          this.loading = false;
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load linked patients.';
        this.loading = false;
      }
    });
  }

  loadPrescriptions(): void {
    if (!this.selectedPatient?.userId) return;

    this.prescriptionService.getPrescriptionsByPatientWithContext(
      this.selectedPatient.userId,
      this.selectedPatient.userId,
      'PATIENT'
    ).subscribe({
      next: prescriptions => {
        this.activePrescriptions = prescriptions.filter(item => item.statut === 'ACTIVE');
        this.historyPrescriptions = prescriptions.filter(item => item.statut !== 'ACTIVE');
        this.applyRouteState();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load prescriptions.';
        this.loading = false;
      }
    });

    this.prescriptionService.getTodayPrescriptionsWithContext(
      this.selectedPatient.userId,
      this.selectedPatient.userId,
      'PATIENT'
    ).subscribe({
      next: prescriptions => this.todayPrescriptions = prescriptions,
      error: () => this.todayPrescriptions = []
    });
  }

  selectPatient(patient: User): void {
    this.selectedPatient = patient;
    this.router.navigate(['/prescriptions/caregiver/patient', patient.userId]);
    this.loadPrescriptions();
  }

  closeDetails(): void {
    this.selectedPrescription = null;
  }

  trackByPatient(_: number, patient: User): string {
    return patient.userId || patient.email;
  }

  trackByPrescription(_: number, prescription: Prescription): string {
    return prescription.prescriptionId;
  }

  goToSection(section: 'active' | 'today' | 'history'): void {
    if (!this.selectedPatient?.userId) {
      return;
    }

    const route = section === 'active'
      ? ['/prescriptions/caregiver/patient', this.selectedPatient.userId, 'active']
      : ['/prescriptions/caregiver/patient', this.selectedPatient.userId, section];
    this.router.navigate(route);
  }

  openPrescriptionRoute(prescription: Prescription): void {
    if (!this.selectedPatient?.userId) {
      return;
    }

    this.router.navigate(['/prescriptions/caregiver/patient', this.selectedPatient.userId, 'prescription', prescription.prescriptionId]);
  }

  private applyRouteState(): void {
    const path = this.route.routeConfig?.path || '';
    const prescriptionId = this.route.snapshot.paramMap.get('prescriptionId');

    if (path.includes('today')) {
      this.activeSection = 'today';
    } else if (path.includes('history')) {
      this.activeSection = 'history';
    } else {
      this.activeSection = 'active';
    }

    if (prescriptionId) {
      const all = [...this.activePrescriptions, ...this.historyPrescriptions];
      this.selectedPrescription = all.find(item => item.prescriptionId === prescriptionId) || null;
    }
  }
}
