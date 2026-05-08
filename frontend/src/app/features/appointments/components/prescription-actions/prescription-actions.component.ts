import { Component, Input, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Prescription } from "../../../prescription/models/prescription.model";
import { PrescriptionService } from '../../../prescription/services/prescription.service';
import { ToastrService } from 'ngx-toastr';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-prescription-actions',
  templateUrl: './prescription-actions.component.html',
  styleUrls: ['./prescription-actions.component.css']
})
export class PrescriptionActionsComponent {
  @Input() prescription!: Prescription;
  @Input() doctorView: boolean = false;

  downloading = false;
  sending = false;

  constructor(
    private prescriptionService: PrescriptionService,
    private toastr: ToastrService,
    private destroyRef: DestroyRef
  ) {}

  downloadPdf(): void {
    this.downloading = true;
    
    this.prescriptionService.downloadPdf(this.prescription.prescriptionId);
    
    // Set a timeout to reset loading state
    setTimeout(() => {
      this.downloading = false;
    }, 2000);
  }

  sendByEmail(): void {
    this.sending = true;
    this.prescriptionService.sendPdfByEmail(this.prescription.prescriptionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastr.success('Prescription sent to patient email.');
          this.sending = false;
        },
        error: (error) => {
          console.error('Email send error:', error);
          this.toastr.error('Failed to send email. Please try again.');
          this.sending = false;
        }
      });
  }
}
