import { Component } from '@angular/core';

type AdminTab =
  | 'overview'
  | 'incidents'
  | 'alerts'
  | 'users'
  | 'analytics'
  | 'ai'
  | 'settings';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  activeTab: AdminTab = 'overview';

  stats = {
    totalPatients: 342,
    totalCaregivers: 128,
    totalDoctors: 45,
    activeUsers: 412,
    totalIncidents: 1847,
    resolvedIncidents: 1623,
    unresolvedIncidents: 224,
    criticalAlerts: 12,
  };

  incidentSummary = {
    total: 5,
    active: 1,
    resolved: 4,
    critical: 1,
  };

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
  }
}

