import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Prescription } from '../../models/prescription.model';
import { PrescriptionService } from '../../services/prescription.service';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-prescription-card',
  templateUrl: './prescription-card.component.html'
})
export class PrescriptionCardComponent {

  @Input() prescription!: Prescription;
  @Input() showActions: boolean = true;

  @Output() onView = new EventEmitter<Prescription>();
  @Output() onRenew = new EventEmitter<Prescription>();
  @Output() onCancel = new EventEmitter<Prescription>();
  @Output() onDownloadPdf = new EventEmitter<Prescription>();

  constructor(
    private prescriptionService: PrescriptionService,
    private toastr: ToastrService
  ) {}

  getStatusClass(): string {
    switch (this.prescription.statut) {
      case 'ACTIVE':     return 'bg-green-100 text-green-700 border-green-200';
      case 'TERMINEE':   return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'INTERROMPUE':return 'bg-red-100 text-red-600 border-red-200';
      case 'RENOUVELEE': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'EXPIREE':    return 'bg-orange-100 text-orange-600 border-orange-200';
      default:           return 'bg-gray-100 text-gray-600 border-gray-200';
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

  isExpiringSoon(): boolean {
    if (!this.prescription.dateFin) return false;
    const daysLeft = this.getDaysLeft();
    return daysLeft <= 7 && daysLeft > 0 && this.prescription.statut === 'ACTIVE';
  }

  getDaysLeft(): number {
    const today = new Date();
    const end = new Date(this.prescription.dateFin);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  hasAlzheimerSchedule(): boolean {
    return !!(this.prescription.priseMatin ||
      this.prescription.priseMidi  ||
      this.prescription.priseSoir);
  }

  quickDownload(prescriptionId: string): void {
    try {
      this.prescriptionService.downloadPdf(prescriptionId);
      this.toastr.success('PDF download started');
    } catch (error) {
      console.error('Quick download error:', error);
      this.toastr.error('Failed to download PDF. Please try again.');
    }
  }
}
