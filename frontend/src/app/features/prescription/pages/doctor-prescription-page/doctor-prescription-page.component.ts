import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { PrescriptionService } from '../../services/prescription.service';
import { Prescription, PrescriptionRequest } from '../../models/prescription.model';

@Component({
  selector: 'app-doctor-prescription-page',
  templateUrl: './doctor-prescription-page.component.html'
})
export class DoctorPrescriptionPageComponent implements OnInit {

  currentUser: User | null = null;

  activeTab: 'issued' | 'new-prescription' = 'issued';

  allPrescriptions: Prescription[] = [];
  activePrescriptions: Prescription[] = [];
  pastPrescriptions: Prescription[] = [];

  selectedPrescription: Prescription | null = null;
  showForm = false;

  // The doctor needs a patientId to prescribe — in real flow this
  // comes from selecting a patient from an appointment OR from query params
  selectedPatientId: string = '';
  selectedAppointmentId: string = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private prescriptionService: PrescriptionService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // First, read query parameters to check if we're coming from an appointment
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['patientId']) {
        this.selectedPatientId = params['patientId'];
      }
      if (params['appointmentId']) {
        this.selectedAppointmentId = params['appointmentId'];
      }
      // If we have a patientId from query params, switch to new-prescription tab
      if (this.selectedPatientId) {
        this.activeTab = 'new-prescription';
      }
    });

    // Then subscribe to auth changes
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
      this.loadPrescriptions();
    });
  }

  loadPrescriptions(): void {
    if (!this.currentUser?.userId) return;
    this.loading = true;

    this.prescriptionService.getPrescriptionsByDoctor(this.currentUser.userId)
      .subscribe({
        next: (data) => {
          this.allPrescriptions = data;
          this.splitPrescriptions(data);
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load prescriptions.';
          this.loading = false;
        }
      });
  }

  private splitPrescriptions(prescriptions: Prescription[]): void {
    this.activePrescriptions = prescriptions.filter(p => p.statut === 'ACTIVE');
    this.pastPrescriptions   = prescriptions.filter(p => p.statut !== 'ACTIVE');
  }

  // ========== STATS ==========

  get totalIssued(): number { return this.allPrescriptions.length; }
  get activeCount(): number { return this.activePrescriptions.length; }
  get expiringCount(): number {
    return this.activePrescriptions.filter(p => {
      if (!p.dateFin) return false;
      const days = Math.ceil(
        (new Date(p.dateFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return days <= 7 && days > 0;
    }).length;
  }

  // ========== EVENTS ==========

  viewPrescription(p: Prescription): void {
    this.selectedPrescription = p;
  }

  closeDetails(): void {
    this.selectedPrescription = null;
  }

  onFormSubmit(request: PrescriptionRequest): void {
    this.loading = true;
    this.prescriptionService.createPrescription(request).subscribe({
      next: (created) => {
        this.loading = false;
        this.activeTab = 'issued';
        this.allPrescriptions.unshift(created);
        this.splitPrescriptions(this.allPrescriptions);
        this.toastr.success('Prescription issued successfully.');
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Failed to issue prescription.');
      }
    });
  }

  onPrescriptionRenewed(renewed: Prescription): void {
    this.selectedPrescription = null;
    this.toastr.success('Prescription renewed.');
    this.loadPrescriptions();
  }

  onPrescriptionCancelled(cancelled: Prescription): void {
    const index = this.allPrescriptions.findIndex(
      p => p.prescriptionId === cancelled.prescriptionId
    );
    if (index !== -1) {
      this.allPrescriptions[index] = cancelled;
      this.splitPrescriptions(this.allPrescriptions);
    }
    this.selectedPrescription = null;
    this.toastr.info('Prescription cancelled.');
  }

  onPdfGenerated(updated: Prescription): void {
    const index = this.allPrescriptions.findIndex(
      p => p.prescriptionId === updated.prescriptionId
    );
    if (index !== -1) { this.allPrescriptions[index] = updated; }
  }
}
