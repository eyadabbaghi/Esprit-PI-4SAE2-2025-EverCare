import { Component, Input } from '@angular/core';
import { MedicalRecord } from '../../models/medical-record.model';

@Component({
  selector: 'app-medical-record-card',
  templateUrl: './medical-record-card.component.html',
  styleUrl: './medical-record-card.component.css'
})
export class MedicalRecordCardComponent {
  @Input() record!: MedicalRecord;
  @Input() limitedRead = false;
}
