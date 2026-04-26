import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CognitiveAlertService } from '../../services/cognitive-alert.service';
import { CognitiveAlert } from '../../models/cognitive-alert.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cognitive-alerts-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="alerts-list" *ngIf="alerts.length > 0; else noAlerts">
      <div class="alert-item" *ngFor="let alert of alerts" [ngClass]="'severity-' + alert.severity.toLowerCase()">
        <div class="alert-header">
          <strong>{{ getSeverityLabel(alert.severity) }}</strong>
          <span class="status" [ngClass]="alert.status.toLowerCase()">{{ alert.status }}</span>
        </div>
        <p>{{ alert.reason }}</p>
        <div class="alert-meta">
          <span>{{ alert.createdAt | date: 'short' }}</span>
          <span *ngIf="alert.acknowledgedAt">Ack: {{ alert.acknowledgedAt | date: 'short' }}</span>
        </div>
        <div class="alert-actions" *ngIf="alert.status === 'ACTIVE'">
          <button class="btn btn-sm btn-outline-warning" (click)="acknowledge(alert.id)">Acknowledge</button>
          <button class="btn btn-sm btn-outline-success" (click)="resolve(alert.id)">Resolve</button>
        </div>
      </div>
    </div>

    <ng-template #noAlerts>
      <p class="no-alerts">No cognitive alerts.</p>
    </ng-template>
  `,
  styles: [`
    .alerts-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .alert-item {
      border-left: 4px solid #ddd;
      padding: 12px;
      margin-bottom: 12px;
      border-radius: 4px;
      background: #f8f9fa;
    }
    .alert-item.severity-low { border-left-color: #28a745; }
    .alert-item.severity-medium { border-left-color: #ffc107; }
    .alert-item.severity-high { border-left-color: #dc3545; }
    .status.active { background: #dc3545; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
    .status.acknowledged { background: #ffc107; color: #000; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
    .status.resolved { background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
    .alert-actions { margin-top: 8px; }
    .no-alerts { text-align: center; color: #6c757d; font-style: italic; padding: 40px; }
  `]
})
export class CognitiveAlertsListComponent implements OnInit {
  @Input() medicalRecordId!: string;
  alerts: CognitiveAlert[] = [];

  constructor(private cognitiveAlertService: CognitiveAlertService) {}

  ngOnInit() {
    if (this.medicalRecordId) {
      this.loadAlerts();
    }
  }

  loadAlerts() {
    this.cognitiveAlertService.listByMedicalRecord(this.medicalRecordId).subscribe({
      next: (alerts) => this.alerts = alerts,
      error: () => this.alerts = []
    });
  }

  acknowledge(id: string) {
    this.cognitiveAlertService.acknowledge(id).subscribe({
      next: (updated) => {
        const index = this.alerts.findIndex(a => a.id === id);
        if (index > -1) this.alerts[index] = updated;
      }
    });
  }

  resolve(id: string) {
    this.cognitiveAlertService.resolve(id).subscribe({
      next: (updated) => {
        const index = this.alerts.findIndex(a => a.id === id);
        if (index > -1) this.alerts[index] = updated;
      }
    });
  }

  getSeverityLabel(severity: string): string {
    const labels = {
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'High'
    };
    return labels[severity as keyof typeof labels] || severity;
  }
}

