import { Component, OnInit } from '@angular/core';
import { Prescription, PrescriptionRequest } from '../../models/prescription.model';
import { PrescriptionService } from '../../services/prescription.service';

@Component({
  selector: 'app-prescription-page',
  templateUrl: './prescription-page.component.html'
})
export class PrescriptionPageComponent implements OnInit {

  // ========== STATE ==========
  activeTab: 'my-prescriptions' | 'new-prescription' | 'medications' = 'my-prescriptions';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // ========== DATA ==========
  allPrescriptions: Prescription[] = [];
  activePrescriptions: Prescription[] = [];
  pastPrescriptions: Prescription[] = [];
  todayPrescriptions: Prescription[] = [];

  // ========== SELECTED ==========
  selectedPrescription: Prescription | null = null;
  showForm: boolean = false;

  // ========== CURRENT USER (replace with your auth service) ==========
  // These should come from your AuthService
  currentUserId: string = 'patient-id-here';
  currentUserRole: 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN' = 'PATIENT';
  currentDoctorId: string = 'doctor-id-here';

  // ========== STATS ==========
  get activeCount(): number {
    return this.allPrescriptions.filter(p => p.statut === 'ACTIVE').length;
  }

  get expiringCount(): number {
    return this.allPrescriptions.filter(p => {
      if (p.statut !== 'ACTIVE' || !p.dateFin) return false;
      const days = Math.ceil(
        (new Date(p.dateFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return days <= 7 && days > 0;
    }).length;
  }

  get renewableCount(): number {
    return this.allPrescriptions.filter(
      p => p.statut === 'ACTIVE' && p.renouvelable && p.nombreRenouvellements > 0
    ).length;
  }

  constructor(private prescriptionService: PrescriptionService) {}

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  // ========== LOAD DATA ==========

  loadPrescriptions(): void {
    this.loading = true;
    this.errorMessage = '';

    this.prescriptionService.getPrescriptionsByPatient(this.currentUserId)
      .subscribe({
        next: (prescriptions) => {
          this.allPrescriptions = prescriptions;
          this.splitPrescriptions(prescriptions);
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load prescriptions. Please try again.';
          this.loading = false;
        }
      });

    // Load today's prescriptions separately for the daily view
    this.prescriptionService.getTodayPrescriptions(this.currentUserId)
      .subscribe({
        next: (prescriptions) => {
          this.todayPrescriptions = prescriptions;
        },
        error: () => {} // silent fail for today's view
      });
  }

  private splitPrescriptions(prescriptions: Prescription[]): void {
    this.activePrescriptions = prescriptions.filter(
      p => p.statut === 'ACTIVE'
    );
    this.pastPrescriptions = prescriptions.filter(
      p => p.statut !== 'ACTIVE'
    );
  }

  // ========== CARD EVENTS ==========

  viewPrescription(prescription: Prescription): void {
    this.selectedPrescription = prescription;
  }

  closeDetails(): void {
    this.selectedPrescription = null;
  }

  onPrescriptionRenewed(renewed: Prescription): void {
    this.selectedPrescription = null;
    this.successMessage = 'Prescription renewed successfully.';
    this.loadPrescriptions();
    this.clearMessageAfterDelay();
  }

  onPrescriptionCancelled(cancelled: Prescription): void {
    // Update in place — no need to reload full list
    const index = this.allPrescriptions.findIndex(
      p => p.prescriptionId === cancelled.prescriptionId
    );
    if (index !== -1) {
      this.allPrescriptions[index] = cancelled;
      this.splitPrescriptions(this.allPrescriptions);
    }
    this.selectedPrescription = null;
    this.successMessage = 'Prescription cancelled.';
    this.clearMessageAfterDelay();
  }

  onPdfGenerated(updated: Prescription): void {
    const index = this.allPrescriptions.findIndex(
      p => p.prescriptionId === updated.prescriptionId
    );
    if (index !== -1) {
      this.allPrescriptions[index] = updated;
    }
  }

  // ========== FORM EVENTS ==========

  onFormSubmit(request: PrescriptionRequest): void {
    this.loading = true;
    this.errorMessage = '';

    this.prescriptionService.createPrescription(request).subscribe({
      next: (created) => {
        this.loading = false;
        this.showForm = false;
        this.activeTab = 'my-prescriptions';
        this.allPrescriptions.unshift(created);
        this.splitPrescriptions(this.allPrescriptions);
        this.successMessage = 'Prescription created successfully.';
        this.clearMessageAfterDelay();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to create prescription.';
      }
    });
  }

  // ========== ROLE HELPERS ==========

  isDoctor(): boolean {
    return this.currentUserRole === 'DOCTOR';
  }

  isPatient(): boolean {
    return this.currentUserRole === 'PATIENT';
  }

  // ========== UTILS ==========

  private clearMessageAfterDelay(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 4000);
  }
}
