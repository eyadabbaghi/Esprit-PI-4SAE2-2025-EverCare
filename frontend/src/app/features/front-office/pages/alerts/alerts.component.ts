import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type IncidentType = 'Medical' | 'Behavioral' | 'Safety';
type AlertStatus = 'active' | 'acknowledged' | 'resolved';

interface Incident {
  id: string;
  title: string;
  type: IncidentType;
  severity: Severity;
  description: string;
  patientName: string;
  patientId: string;
  patientAvatar?: string;
  patientAge?: number;
  location: string;
  createdAt: Date;
  detectedBy: string;
  status: 'active' | 'resolved';
  comments: { user: string; text: string; time: Date }[];
  aiSuggestion?: string;
  medicalNotes?: string;
  vitalSigns?: { heartRate?: number; bloodPressure?: string; temperature?: number };
  medicationAdherence?: number;
}

interface Alert {
  id: string;
  incidentId: string;
  status: AlertStatus;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  targetRoles: string[];
  notificationChannels: string[];
  acknowledgedBy?: string;
  resolvedBy?: string;
}

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css'],
})
export class AlertsComponent implements OnInit, OnDestroy {
  // Role (stubbed – wire to auth service if available)
  userRole: 'doctor' | 'caregiver' | 'patient' | 'admin' = 'caregiver';

  get isDoctor(): boolean {
    return this.userRole === 'doctor';
  }

  get isPatient(): boolean {
    return this.userRole === 'patient';
  }

  // Filters
  searchQuery = '';
  filterSeverity: Severity | 'all' = 'all';
  filterType: IncidentType | 'all' = 'all';
  filterStatus: AlertStatus | 'all' = 'all';
  selectedPatientFilter = 'all';

  // Pagination
  readonly INCIDENTS_PER_PAGE = 5;
  readonly ALERTS_PER_PAGE = 4;
  incidentPage = 1;
  alertsPage = 1;

  // Data
  incidents: Incident[] = [
    {
      id: 'INC-001',
      title: 'Fall Detected in Bathroom',
      type: 'Safety',
      severity: 'CRITICAL',
      description:
        'Sudden impact detected. Patient may have fallen. Emergency response activated.',
      patientName: 'John Anderson',
      patientId: 'P-001',
      patientAge: 78,
      location: 'Bathroom - Main Floor',
      createdAt: new Date(Date.now() - 45 * 60000),
      detectedBy: 'Smart Sensor System',
      status: 'active',
      comments: [],
      aiSuggestion:
        'Pattern detected: 3rd fall in bathroom this month. Consider installing grab bars.',
      medicalNotes: 'Patient has history of dizziness. Monitor blood pressure.',
      vitalSigns: { heartRate: 92, bloodPressure: '140/90', temperature: 98.6 },
      medicationAdherence: 85,
    },
    {
      id: 'INC-002',
      title: 'Missed Medication - Morning Dose',
      type: 'Medical',
      severity: 'HIGH',
      description: 'Patient did not take scheduled 8:00 AM medication.',
      patientName: 'Mary Wilson',
      patientId: 'P-002',
      patientAge: 82,
      location: 'Home - Bedroom',
      createdAt: new Date(Date.now() - 120 * 60000),
      detectedBy: 'Medication Tracking System',
      status: 'resolved',
      comments: [],
      vitalSigns: { heartRate: 78, bloodPressure: '130/85', temperature: 98.2 },
      medicationAdherence: 75,
    },
    {
      id: 'INC-003',
      title: 'Wandering Alert - Left Safe Zone',
      type: 'Safety',
      severity: 'HIGH',
      description: 'GPS tracking shows patient left designated safe zone.',
      patientName: 'Robert Chen',
      patientId: 'P-003',
      patientAge: 75,
      location: 'Oak Street Park',
      createdAt: new Date(Date.now() - 30 * 60000),
      detectedBy: 'GPS System',
      status: 'active',
      comments: [],
      aiSuggestion: '4th wandering incident this week, all 2-4 PM. Schedule activities.',
      medicationAdherence: 90,
    },
  ];

  alerts: Alert[] = [
    {
      id: 'ALT-001',
      incidentId: 'INC-001',
      status: 'active',
      triggeredAt: new Date(Date.now() - 45 * 60000),
      targetRoles: ['Caregiver', 'Doctor', 'Emergency Contacts'],
      notificationChannels: ['in-app', 'sms', 'phone-call'],
    },
    {
      id: 'ALT-002',
      incidentId: 'INC-002',
      status: 'resolved',
      triggeredAt: new Date(Date.now() - 120 * 60000),
      acknowledgedAt: new Date(Date.now() - 90 * 60000),
      resolvedAt: new Date(Date.now() - 60 * 60000),
      targetRoles: ['Caregiver'],
      notificationChannels: ['in-app', 'sms'],
      acknowledgedBy: 'Caregiver John',
      resolvedBy: 'Caregiver John',
    },
    {
      id: 'ALT-003',
      incidentId: 'INC-003',
      status: 'acknowledged',
      triggeredAt: new Date(Date.now() - 30 * 60000),
      acknowledgedAt: new Date(Date.now() - 28 * 60000),
      targetRoles: ['Caregiver', 'Family'],
      notificationChannels: ['in-app', 'sms'],
      acknowledgedBy: 'Caregiver Lisa',
    },
  ];

  // Selection
  selectedIncident: Incident | null = null;
  selectedAlert: Alert | null = null;

  // Inline forms
  showIncidentForm = false;
  editingIncident: Incident | null = null;

  showAlertForm = false;
  editingAlert: Alert | null = null;

  newIncident: {
    title: string;
    type: IncidentType;
    severity: Severity;
    description: string;
    patientId: string;
    location: string;
  } = {
    title: '',
    type: 'Medical',
    severity: 'MEDIUM',
    description: '',
    patientId: '',
    location: '',
  };

  newAlert: {
    targetRoles: string[];
    notificationChannels: string[];
    triggerTime: string;
  } = {
    targetRoles: [],
    notificationChannels: [],
    triggerTime: '',
  };

  currentTime = new Date();
  private timerId?: any;
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private readonly toastr: ToastrService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.newAlert.triggerTime = this.getDefaultTriggerTime();
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.timerId = setInterval(() => {
        this.currentTime = new Date();
      }, 60000);
    }
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  get stats() {
    return {
      total: this.alerts.length,
      active: this.alerts.filter((a) => a.status === 'active').length,
      resolved: this.alerts.filter((a) => a.status === 'resolved').length,
      critical: this.alerts.filter((a) => {
        const inc = this.incidents.find((i) => i.id === a.incidentId);
        return inc?.severity === 'CRITICAL' && a.status === 'active';
      }).length,
    };
  }

  private getIncidentStatus(incidentId: string): AlertStatus | 'none' {
    const related = this.alerts.filter((a) => a.incidentId === incidentId);
    if (!related.length) {
      return 'none';
    }
    if (related.some((a) => a.status === 'active')) {
      return 'active';
    }
    if (related.some((a) => a.status === 'acknowledged')) {
      return 'acknowledged';
    }
    if (related.some((a) => a.status === 'resolved')) {
      return 'resolved';
    }
    return 'none';
  }

  get filteredIncidents(): Incident[] {
    return this.incidents.filter((incident) => {
      const status = this.getIncidentStatus(incident.id);

      const matchesSearch =
        incident.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        incident.patientName.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesSeverity =
        this.filterSeverity === 'all' || incident.severity === this.filterSeverity;

      const matchesType =
        this.filterType === 'all' || incident.type === this.filterType;

      const matchesStatus =
        this.filterStatus === 'all' || (status !== 'none' && status === this.filterStatus);

      const matchesPatient =
        this.selectedPatientFilter === 'all' ||
        incident.patientId === this.selectedPatientFilter;

      return matchesSearch && matchesSeverity && matchesType && matchesStatus && matchesPatient;
    });
  }

  get totalIncidentPages(): number {
    return Math.max(1, Math.ceil(this.filteredIncidents.length / this.INCIDENTS_PER_PAGE));
  }

  get paginatedIncidents(): Incident[] {
    const start = (this.incidentPage - 1) * this.INCIDENTS_PER_PAGE;
    return this.filteredIncidents.slice(start, start + this.INCIDENTS_PER_PAGE);
  }

  get alertsForSelectedIncident(): Alert[] {
    if (!this.selectedIncident) {
      return [];
    }
    return this.alerts.filter((a) => a.incidentId === this.selectedIncident!.id);
  }

  get totalAlertPages(): number {
    return Math.max(1, Math.ceil(this.alertsForSelectedIncident.length / this.ALERTS_PER_PAGE));
  }

  get paginatedAlerts(): Alert[] {
    const start = (this.alertsPage - 1) * this.ALERTS_PER_PAGE;
    return this.alertsForSelectedIncident.slice(start, start + this.ALERTS_PER_PAGE);
  }

  getFirstAlert(incidentId: string): Alert | undefined {
    return this.alerts.find((a) => a.incidentId === incidentId);
  }

  // Alerts

  acknowledge(alert: Alert): void {
    if (alert.status !== 'active') {
      return;
    }
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = 'You';
    this.toastr.success('Alert acknowledged');
  }

  resolve(alert: Alert): void {
    if (alert.status === 'resolved') {
      return;
    }
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = 'You';
    this.toastr.success('Alert resolved');
  }

  openCreateAlert(incident: Incident): void {
    this.selectedIncident = incident;
    this.showAlertForm = true;
    this.editingAlert = null;
    this.newAlert = {
      targetRoles: [],
      notificationChannels: [],
      triggerTime: this.getDefaultTriggerTime(),
    };
    this.alertsPage = 1;
  }

  openEditAlert(alert: Alert): void {
    this.editingAlert = alert;
    this.showAlertForm = true;
    this.newAlert = {
      targetRoles: [...alert.targetRoles],
      notificationChannels: [...alert.notificationChannels],
      triggerTime: this.formatTimeForInput(alert.triggeredAt),
    };
  }

  saveAlert(): void {
    if (!this.selectedIncident) {
      return;
    }

    if (!this.newAlert.triggerTime) {
      this.toastr.error('Please choose a trigger time for the alert');
      return;
    }

    if (this.editingAlert) {
      this.alerts = this.alerts.map((a) =>
        a.id === this.editingAlert!.id
          ? {
              ...a,
              targetRoles: [...this.newAlert.targetRoles],
              notificationChannels: [...this.newAlert.notificationChannels],
              triggeredAt: this.computeNextTriggerDate(this.newAlert.triggerTime),
            }
          : a,
      );
      this.toastr.success('Alert updated');
    } else {
      const newAlert: Alert = {
        id: `ALT-${Date.now()}`,
        incidentId: this.selectedIncident.id,
        status: 'active',
        triggeredAt: this.computeNextTriggerDate(this.newAlert.triggerTime),
        targetRoles: [...this.newAlert.targetRoles],
        notificationChannels: [...this.newAlert.notificationChannels],
      };
      this.alerts = [newAlert, ...this.alerts];
      this.toastr.success('Alert created');
    }

    this.showAlertForm = false;
    this.editingAlert = null;
    this.newAlert = {
      targetRoles: [],
      notificationChannels: [],
      triggerTime: this.getDefaultTriggerTime(),
    };
  }

  deleteAlert(alert: Alert): void {
    this.alerts = this.alerts.filter((a) => a.id !== alert.id);
    if (this.selectedAlert?.id === alert.id) {
      this.selectedAlert = null;
    }
    this.toastr.success('Alert deleted');
  }

  // Incidents

  onCreateIncidentClick(): void {
    this.showIncidentForm = true;
    this.editingIncident = null;
    this.newIncident = {
      title: '',
      type: 'Medical',
      severity: 'MEDIUM',
      description: '',
      patientId: '',
      location: '',
    };
  }

  createIncident(): void {
    const patient = this.getPatientById(this.newIncident.patientId);
    const incident: Incident = {
      id: `INC-${Date.now()}`,
      title: this.newIncident.title,
      type: this.newIncident.type,
      severity: this.newIncident.severity,
      description: this.newIncident.description,
      patientName: patient?.name || 'Unknown',
      patientId: this.newIncident.patientId,
      patientAvatar: patient?.avatar,
      patientAge: patient?.age,
      location: this.newIncident.location,
      createdAt: new Date(),
      detectedBy: 'System',
      status: 'active',
      comments: [],
    };

    this.incidents = [incident, ...this.incidents];
    this.showIncidentForm = false;
    this.newIncident = {
      title: '',
      type: 'Medical',
      severity: 'MEDIUM',
      description: '',
      patientId: '',
      location: '',
    };
    this.toastr.success('Incident created');
  }

  openEditIncident(incident: Incident): void {
    this.editingIncident = incident;
    this.showIncidentForm = true;
    this.newIncident = {
      title: incident.title,
      type: incident.type,
      severity: incident.severity,
      description: incident.description,
      patientId: incident.patientId,
      location: incident.location,
    };
  }

  saveIncident(): void {
    if (!this.editingIncident) {
      return;
    }
    this.incidents = this.incidents.map((i) =>
      i.id === this.editingIncident!.id
        ? {
            ...i,
            title: this.newIncident.title,
            type: this.newIncident.type,
            severity: this.newIncident.severity,
            description: this.newIncident.description,
            location: this.newIncident.location,
          }
        : i,
    );
    this.editingIncident = null;
    this.showIncidentForm = false;
    this.newIncident = {
      title: '',
      type: 'Medical',
      severity: 'MEDIUM',
      description: '',
      patientId: '',
      location: '',
    };
    this.toastr.success('Incident updated');
  }

  deleteIncident(incident: Incident): void {
    this.incidents = this.incidents.filter((i) => i.id !== incident.id);
    this.alerts = this.alerts.filter((a) => a.incidentId !== incident.id);
    if (this.selectedIncident?.id === incident.id) {
      this.selectedIncident = null;
      this.selectedAlert = null;
    }
    this.toastr.success('Incident and related alerts deleted');
  }

  // Selection & pagination

  selectIncident(incident: Incident): void {
    this.selectedIncident = incident;
    this.selectedAlert = this.getFirstAlert(incident.id) || null;
    this.alertsPage = 1;
  }

  previousIncidentPage(): void {
    if (this.incidentPage > 1) {
      this.incidentPage -= 1;
    }
  }

  nextIncidentPage(): void {
    if (this.incidentPage < this.totalIncidentPages) {
      this.incidentPage += 1;
    }
  }

  previousAlertsPage(): void {
    if (this.alertsPage > 1) {
      this.alertsPage -= 1;
    }
  }

  nextAlertsPage(): void {
    if (this.alertsPage < this.totalAlertPages) {
      this.alertsPage += 1;
    }
  }

  // Styling helpers

  getSeverityBadgeClasses(severity: Severity): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#C06C84] text-white';
      case 'HIGH':
        return 'bg-[#B39DDB] text-white';
      case 'MEDIUM':
        return 'bg-[#DCCEF9] text-[#7C3AED]';
      case 'LOW':
        return 'bg-[#A8E6CF] text-[#22c55e]';
    }
  }

  getStatusBadgeClasses(status: AlertStatus): string {
    switch (status) {
      case 'active':
        return 'bg-[#C06C84] text-white';
      case 'acknowledged':
        return 'bg-[#F59E0B] text-white';
      case 'resolved':
        return 'bg-[#22c55e] text-white';
    }
  }

  getElapsedMinutes(date: Date): string {
    const diff = date.getTime() - this.currentTime.getTime();
    const minutes = Math.floor(Math.abs(diff) / 60000);
    const hours = Math.floor(minutes / 60);
    if (diff > 0) {
      if (hours > 0) {
        return `in ${hours}h ${minutes % 60}m`;
      }
      return `in ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
  }

  private getPatientById(id: string) {
    return [
      { id: 'P-001', name: 'John Anderson', avatar: '', age: 78 },
      { id: 'P-002', name: 'Mary Wilson', avatar: '', age: 82 },
      { id: 'P-003', name: 'Robert Chen', avatar: '', age: 75 },
      { id: 'P-004', name: 'Emma Davis', avatar: '', age: 80 },
    ].find((p) => p.id === id);
  }

  private getDefaultTriggerTime(): string {
    const now = new Date();
    // Default to 5 minutes from now, like many alarm apps
    now.setMinutes(now.getMinutes() + 5);
    return this.formatTimeForInput(now);
  }

  private computeNextTriggerDate(time: string): Date {
    const [hoursStr, minutesStr] = time.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    const now = new Date();
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule it for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled;
  }

  private formatTimeForInput(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Helpers used from template to avoid complex expressions there
  onTargetRoleToggle(role: string, checked: boolean): void {
    if (checked) {
      if (!this.newAlert.targetRoles.includes(role)) {
        this.newAlert.targetRoles = [...this.newAlert.targetRoles, role];
      }
    } else {
      this.newAlert.targetRoles = this.newAlert.targetRoles.filter((r) => r !== role);
    }
  }

  onChannelToggle(channel: string, checked: boolean): void {
    if (checked) {
      if (!this.newAlert.notificationChannels.includes(channel)) {
        this.newAlert.notificationChannels = [...this.newAlert.notificationChannels, channel];
      }
    } else {
      this.newAlert.notificationChannels = this.newAlert.notificationChannels.filter(
        (c) => c !== channel,
      );
    }
  }

  getInitials(name?: string): string {
    if (!name) {
      return '';
    }
    return name
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part[0])
      .join('');
  }
}

