import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Severity } from '../../../../core/model/alerts.models';

export interface IncidentUI {
  incidentId: string;
  title: string;
  type: string;
  severity: Severity;
  description: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  location: string;
  incidentDate: Date;
  reportedByUserId: string;
  status: 'OPEN' | 'RESOLVED';
  aiSuggestion?: string;
  patientEmail?: string;   // <-- add this

  // ... other fields as needed
}

@Component({
  selector: 'app-incident-details-dialog',
  templateUrl: './incident-details-dialog.component.html',
})
export class IncidentDetailsDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { incident: IncidentUI }) {}

  getSeverityBadgeClasses(severity: Severity): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-[#C06C84] text-white';
      case 'HIGH': return 'bg-[#B39DDB] text-white';
      case 'MEDIUM': return 'bg-[#DCCEF9] text-[#7C3AED]';
      case 'LOW': return 'bg-[#A8E6CF] text-[#22c55e]';
      default: return '';
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
}