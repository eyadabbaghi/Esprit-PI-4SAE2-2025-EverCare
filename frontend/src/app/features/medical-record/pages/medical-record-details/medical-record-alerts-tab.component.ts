import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CognitiveAlertService } from '../../services/cognitive-alert.service';
import { CognitiveAlert } from '../../models/cognitive-alert.model';

import { RouterModule } from '@angular/router';
import { BehaviorSubject, switchMap } from 'rxjs';

@Component({
  selector: 'app-medical-record-alerts-tab',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="alerts-tab">
      <div class="tab-header">
        <h5>🔔 Alertes Cognitives</h5>
        <span class="badge badge-danger">{{ alerts.length }}</span>
      </div>
      <div class="alerts-container">
        <div *ngIf="loading" class="loading">Chargement...</div>

        <ng-container *ngIf="!loading">
          <div *ngFor="let alert of alerts" class="alert-card" [ngClass]="'severity-' + alert.severity.toLowerCase()">
            <div class="alert-top">
              <h6>{{ alert.reason }}</h6>
              <span class="status-badge status-{{alert.status.toLowerCase()}}">
                {{ alert.status }}
              </span>
            </div>
            <div class="alert-meta">
              <span>{{ alert.createdAt | date:'short' }}</span>
              <span *ngIf="alert.patientId">ID: {{alert.patientId}}</span>
            </div>
            <div class="alert-actions" *ngIf="alert.status === 'ACTIVE'">
              <button class="btn btn-warning btn-sm" (click)="acknowledgeAlert(alert.id)">
                Acknowledger
              </button>
              <button class="btn btn-success btn-sm" (click)="resolveAlert(alert.id)">
                Résoudre
              </button>
            </div>
          </div>
          <div *ngIf="alerts.length === 0" class="no-alerts">
            ✅ Aucune alerte cognitive active
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .alerts-tab {
      padding: 20px;
    }
    .tab-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8em;
    }
    .alert-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .alert-card.severity-low { border-left: 4px solid #28a745; }
    .alert-card.severity-medium { border-left: 4px solid #ffc107; }
    .alert-card.severity-high { border-left: 4px solid #dc3545; }
    .alert-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .status-badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75em;
      font-weight: 600;
    }
    .status-badge.status-active { background: #dc3545; color: white; }
    .status-badge.status-acknowledged { background: #ffc107; color: #000; }
    .status-badge.status-resolved { background: #28a745; color: white; }
    .alert-meta {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 12px;
    }
    .alert-actions {
      display: flex;
      gap: 8px;
    }
    .no-alerts {
      text-align: center;
      color: #28a745;
      font-size: 1.1em;
      padding: 40px 20px;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  `]
})
export class MedicalRecordAlertsTabComponent {
  @Input() medicalRecordId = '';
  alerts: CognitiveAlert[] = [];
  loading = false;

  private refresh$ = new BehaviorSubject(true);

  constructor(private cognitiveAlertService: CognitiveAlertService) {
    this.refresh$.pipe(
      switchMap(() => {
        this.loading = true;
        return this.cognitiveAlertService.listByMedicalRecord(this.medicalRecordId);
      })
    ).subscribe({
      next: (data) => {
        this.alerts = data;
        this.loading = false;
      },
      error: () => {
        this.alerts = [];
        this.loading = false;
      }
    });
  }

  acknowledgeAlert(alertId: string) {
    this.cognitiveAlertService.acknowledge(alertId).subscribe({
      next: (updatedAlert: CognitiveAlert) => {
        const idx = this.alerts.findIndex(a => a.id === alertId);
        if (idx > -1) this.alerts[idx] = updatedAlert;
      }
    });
  }

  resolveAlert(alertId: string) {
    this.cognitiveAlertService.resolve(alertId).subscribe({
      next: (updatedAlert: CognitiveAlert) => {
        const idx = this.alerts.findIndex(a => a.id === alertId);
        if (idx > -1) this.alerts[idx] = updatedAlert;
      }
    });
  }
}


