import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Prescription } from '../../models/prescription.model';

@Component({
  selector: 'app-prescription-list',
  templateUrl: './prescription-list.component.html'
})
export class PrescriptionListComponent {

  @Input() title: string = 'Prescriptions';
  @Input() prescriptions: Prescription[] = [];
  @Input() emptyMessage: string = 'No prescriptions found';
  @Input() showActions: boolean = true;
  @Input() scrollable: boolean = true;
  @Input() loading: boolean = false;

  @Output() onView = new EventEmitter<Prescription>();
  @Output() onRenew = new EventEmitter<Prescription>();
  @Output() onCancel = new EventEmitter<Prescription>();
  @Output() onDownloadPdf = new EventEmitter<Prescription>();
}
