import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService, User } from '../login/auth.service';
import { UserService, Patient } from '../../../../core/services/user.service';
import { AlertsService } from '../../../../core/services/alerts.service';
import {
  Alert,
  AlertStatus,
  Incident,
  Severity,
} from '../../../../core/model/alerts.models';

type AlertStatusFilter = 'ALL' | AlertStatus;
type SeverityFilter = 'ALL' | Severity;

interface AlertListItem {
  alert: Alert;
  incident?: Incident;
  patientId: string;
  patientName: string;
}

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css'],
})
export class AlertsComponent implements OnInit, OnDestroy {
  user: User | null = null;
  patients: Patient[] = [];
  incidents: Incident[] = [];
  alerts: Alert[] = [];

  selectedPatientId = '';
  searchQuery = '';
  statusFilter: AlertStatusFilter = 'ALL';
  severityFilter: SeverityFilter = 'ALL';

  loadingPatients = false;
  loadingData = false;

  private readonly sub = new Subscription();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly alertsService: AlertsService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.authService.currentUser$.subscribe((user) => {
        this.user = user;

        if (!user) {
          this.resetState();
          return;
        }

        if (this.isPatientView) {
          this.selectedPatientId = String(user.userId || '').trim();
          this.loadAlertsData();
          return;
        }

        this.loadPatients();
        this.loadAlertsData();
      }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get isPatientView(): boolean {
    return String(this.user?.role || '').toLowerCase() === 'patient';
  }

  get stats(): { total: number; sent: number; acknowledged: number; critical: number } {
    return {
      total: this.filteredAlertItems.length,
      sent: this.filteredAlertItems.filter((item) => item.alert.status === 'SENT').length,
      acknowledged: this.filteredAlertItems.filter((item) => item.alert.status === 'ACKNOWLEDGED')
        .length,
      critical: this.filteredIncidents.filter(
        (incident) => incident.severity === 'CRITICAL' && incident.status !== 'RESOLVED',
      ).length,
    };
  }

  get filteredIncidents(): Incident[] {
    const query = this.searchQuery.trim().toLowerCase();

    return [...this.incidents]
      .filter((incident) => this.matchesPatient(incident.patientId))
      .filter((incident) => this.severityFilter === 'ALL' || incident.severity === this.severityFilter)
      .filter((incident) => {
        if (!query) {
          return true;
        }

        return (
          incident.title.toLowerCase().includes(query) ||
          incident.description.toLowerCase().includes(query) ||
          String(incident.patientName || incident.patientId || '').toLowerCase().includes(query)
        );
      })
      .sort((left, right) => this.toTime(right.incidentDate) - this.toTime(left.incidentDate));
  }

  get filteredAlertItems(): AlertListItem[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.alerts
      .map((alert) => this.buildAlertItem(alert))
      .filter((item) => this.matchesPatient(item.patientId))
      .filter((item) => this.statusFilter === 'ALL' || item.alert.status === this.statusFilter)
      .filter(
        (item) =>
          this.severityFilter === 'ALL' || item.incident?.severity === this.severityFilter,
      )
      .filter((item) => {
        if (!query) {
          return true;
        }

        return (
          String(item.alert.label || '').toLowerCase().includes(query) ||
          String(item.patientName || '').toLowerCase().includes(query) ||
          String(item.incident?.title || '').toLowerCase().includes(query) ||
          String(item.incident?.description || '').toLowerCase().includes(query)
        );
      })
      .sort((left, right) => this.toTime(right.alert.sentAt) - this.toTime(left.alert.sentAt));
  }

  get hasSelectedPatient(): boolean {
    return this.isPatientView || this.selectedPatientId.trim().length > 0;
  }

  get selectedPatientName(): string {
    if (this.isPatientView) {
      return this.user?.name || this.user?.email || 'My alerts';
    }

    if (!this.selectedPatientId) {
      return 'All patients';
    }

    const patient = this.patients.find((item) => item.userId === this.selectedPatientId);
    return patient?.name || this.selectedPatientId;
  }

  onPatientChange(): void {
    this.selectedPatientId = String(this.selectedPatientId || '').trim();
  }

  refreshData(): void {
    this.loadAlertsData();
  }

  acknowledgeAlert(item: AlertListItem): void {
    if (item.alert.status !== 'SENT') {
      return;
    }

    this.sub.add(
      this.alertsService.acknowledgeAlert(item.alert.alertId).subscribe({
        next: (updated) => {
          this.alerts = this.alerts.map((alert) =>
            alert.alertId === updated.alertId ? updated : alert,
          );
          this.toastr.success('Alert acknowledged');
        },
        error: () => this.toastr.error('Could not acknowledge alert'),
      }),
    );
  }

  resolveAlert(item: AlertListItem): void {
    if (item.alert.status === 'RESOLVED') {
      return;
    }

    this.sub.add(
      this.alertsService.resolveAlert(item.alert.alertId).subscribe({
        next: (updated) => {
          this.alerts = this.alerts.map((alert) =>
            alert.alertId === updated.alertId ? updated : alert,
          );
          this.toastr.success('Alert resolved');
        },
        error: () => this.toastr.error('Could not resolve alert'),
      }),
    );
  }

  trackIncident(index: number, incident: Incident): string {
    return incident.incidentId || String(index);
  }

  trackAlert(index: number, item: AlertListItem): string {
    return item.alert.alertId || String(index);
  }

  getSeverityBadgeClasses(severity: Severity): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]';
      case 'HIGH':
        return 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]';
      case 'MEDIUM':
        return 'bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE]';
      case 'LOW':
        return 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]';
    }
  }

  getIncidentStatusClasses(status: Incident['status']): string {
    switch (status) {
      case 'OPEN':
        return 'bg-[#FEE2E2] text-[#B91C1C]';
      case 'ACKNOWLEDGED':
        return 'bg-[#FEF3C7] text-[#B45309]';
      case 'RESOLVED':
        return 'bg-[#DCFCE7] text-[#15803D]';
    }
  }

  getAlertStatusClasses(status: Alert['status']): string {
    switch (status) {
      case 'SENT':
        return 'bg-[#FEE2E2] text-[#B91C1C]';
      case 'ACKNOWLEDGED':
        return 'bg-[#FEF3C7] text-[#B45309]';
      case 'RESOLVED':
        return 'bg-[#DCFCE7] text-[#15803D]';
    }
  }

  private loadPatients(): void {
    this.loadingPatients = true;

    this.sub.add(
      this.userService.getPatients().subscribe({
        next: (patients) => {
          this.patients = patients || [];
          this.loadingPatients = false;
        },
        error: () => {
          this.patients = [];
          this.loadingPatients = false;
        },
      }),
    );
  }

  private loadAlertsData(): void {
    this.loadingData = true;

    this.sub.add(
      forkJoin({
        incidents: this.alertsService.getIncidents(),
        alerts: this.alertsService.getAlerts(),
      }).subscribe({
        next: ({ incidents, alerts }) => {
          this.incidents = incidents || [];
          this.alerts = alerts || [];
          this.loadingData = false;
        },
        error: () => {
          this.incidents = [];
          this.alerts = [];
          this.loadingData = false;
          this.toastr.error('Could not load alerts data');
        },
      }),
    );
  }

  private buildAlertItem(alert: Alert): AlertListItem {
    const incident = this.incidents.find((entry) => entry.incidentId === alert.incidentId);
    const patientId = incident?.patientId || alert.targetId || '';
    const patientName = this.getPatientName(patientId, incident?.patientName);

    return {
      alert,
      incident,
      patientId,
      patientName,
    };
  }

  private getPatientName(patientId: string, fallback?: string): string {
    if (fallback) {
      return fallback;
    }

    const patient = this.patients.find((entry) => entry.userId === patientId);
    return patient?.name || patientId || 'Unknown patient';
  }

  private matchesPatient(patientId: string): boolean {
    if (!this.selectedPatientId) {
      return true;
    }

    return patientId === this.selectedPatientId;
  }

  private toTime(value: Date | string | undefined): number {
    if (!value) {
      return 0;
    }

    return new Date(value).getTime();
  }

  private resetState(): void {
    this.patients = [];
    this.incidents = [];
    this.alerts = [];
    this.selectedPatientId = '';
  }
}
