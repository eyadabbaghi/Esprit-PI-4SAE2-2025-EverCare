import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Prescription } from '../../models/prescription.model';
import { PrescriptionService } from '../../services/prescription.service';

@Component({
  selector: 'app-prescription-details',
  templateUrl: './prescription-details.component.html'
})
export class PrescriptionDetailsComponent implements OnInit {

  @Input() prescription!: Prescription;

  @Output() onClose = new EventEmitter<void>();
  @Output() onRenewed = new EventEmitter<Prescription>();
  @Output() onCancelled = new EventEmitter<Prescription>();
  @Output() onPdfGenerated = new EventEmitter<Prescription>();

  activeView: 'full' | 'alzheimer' = 'full';
  showRenewForm: boolean = false;
  showCancelConfirm: boolean = false;

  newDateFin: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private prescriptionService: PrescriptionService) {}

  ngOnInit(): void {
    // Default renew end date to 30 days after current end date
    if (this.prescription.dateFin) {
      const current = new Date(this.prescription.dateFin);
      current.setDate(current.getDate() + 30);
      this.newDateFin = current.toISOString().split('T')[0];
    }
  }

  // ========== STATUS HELPERS ==========

  getStatusClass(): string {
    switch (this.prescription.statut) {
      case 'ACTIVE':      return 'bg-green-100 text-green-700 border-green-200';
      case 'TERMINEE':    return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'INTERROMPUE': return 'bg-red-100 text-red-600 border-red-200';
      case 'RENOUVELEE':  return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'EXPIREE':     return 'bg-orange-100 text-orange-600 border-orange-200';
      default:            return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  getStatusLabel(): string {
    switch (this.prescription.statut) {
      case 'ACTIVE':      return 'Active';
      case 'TERMINEE':    return 'Completed';
      case 'INTERROMPUE': return 'Cancelled';
      case 'RENOUVELEE':  return 'Renewed';
      case 'EXPIREE':     return 'Expired';
      default:            return this.prescription.statut;
    }
  }

  getDaysLeft(): number {
    const today = new Date();
    const end = new Date(this.prescription.dateFin);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  isExpiringSoon(): boolean {
    const days = this.getDaysLeft();
    return days <= 7 && days > 0 && this.prescription.statut === 'ACTIVE';
  }

  hasAlzheimerSchedule(): boolean {
    return !!(this.prescription.priseMatin ||
      this.prescription.priseMidi  ||
      this.prescription.priseSoir);
  }

  // ========== ACTIONS ==========

  confirmRenew(): void {
    if (!this.newDateFin) {
      this.errorMessage = 'Please select a new end date.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.prescriptionService.renewPrescription(
      this.prescription.prescriptionId,
      this.newDateFin
    ).subscribe({
      next: (renewed) => {
        this.loading = false;
        this.showRenewForm = false;
        this.successMessage = 'Prescription renewed successfully.';
        this.onRenewed.emit(renewed);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to renew prescription.';
      }
    });
  }

  confirmCancel(): void {
    this.loading = true;
    this.errorMessage = '';

    this.prescriptionService.cancelPrescription(
      this.prescription.prescriptionId
    ).subscribe({
      next: (cancelled) => {
        this.loading = false;
        this.showCancelConfirm = false;
        this.successMessage = 'Prescription cancelled.';
        this.prescription = cancelled;
        this.onCancelled.emit(cancelled);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to cancel prescription.';
      }
    });
  }

  generatePdf(): void {
    this.loading = true;
    this.prescriptionService.generatePdf(
      this.prescription.prescriptionId
    ).subscribe({
      next: (updated) => {
        this.loading = false;
        this.prescription = updated;
        this.successMessage = 'PDF generated successfully.';
        this.onPdfGenerated.emit(updated);

        // Open PDF in new tab if URL is available
        if (updated.pdfUrl) {
          window.open(updated.pdfUrl, '_blank');
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to generate PDF.';
      }
    });
  }
}
