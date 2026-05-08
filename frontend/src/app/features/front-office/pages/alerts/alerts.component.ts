import { Component, Inject, NgZone, OnDestroy, OnInit } from '@angular/core'; // ← add NgZone here
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AuthService, User } from '../../../../features/front-office/pages/login/auth.service';
import { AlertsService } from '../../../../core/services/alerts.service';
import { UserService, Patient } from '../../../../core/services/user.service';
import { AddIncidentDialogComponent } from '../../../../add-incident-dialog/add-incident-dialog.component';
import { AddAlertDialogComponent } from '../../../../add-alert-dialog/add-alert-dialog.component';
import { Incident, Alert, Severity, IncidentType, AlertStatus } from '../../../../core/model/alerts.models';
// At the top with other imports
import { IncidentDetailsDialogComponent } from './incident-details-dialog.component';
import { AlertSchedulerService } from '../../../../core/services/alert-scheduler.service';
import { VoiceSosService } from '../../../../core/services/voice-sos.service';
import { CheckService } from './services/check.service';
import { ConfirmDialogComponent } from './components/confirm-dialog.component';

// Extended UI models (include extra fields for display)
interface IncidentUI extends Incident {
  patientName: string;
  patientAvatar?: string;
  patientAge?: number;
  detectedBy: string;
  comments: any[];
  aiSuggestion?: string;
  medicalNotes?: string;
  vitalSigns?: any;
  medicationAdherence?: number;
  patientEmail?: string;   // add this

}

interface AlertUI extends Alert {
  senderName?: string;
  senderAvatar?: string;
  targetName?: string;
  label?: string;   // <-- add this
  immediate?: boolean;
  scheduledTime?: string;
  repeatDays?: string[];
}

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css'],
})
export class AlertsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  voiceListening = false;
  private voiceStarted = false;
  userRole: 'doctor' | 'caregiver' | 'patient' | 'admin' = 'caregiver';
  patientCache: Map<string, { name: string; avatar?: string; email?: string }> = new Map();
  // For caregivers: set of patient IDs they are allowed to see
  allowedPatientIds: Set<string> | null = null;
// For doctors: list of patients they are connected to
doctorPatients: Patient[] = [];
selectedDoctorPatient: Patient | null = null;
sosPopupVisible = false;
sosCountdown = 10;
private sosCountdownTimer?: any;

eviCarePopupVisible = false;
eviCareRiskScore: any = null;

// Voice-guided check properties
currentUserId!: string;
patientId!: string;
caregiverId!: string;

checkPopupVisible = false;
checkPopupPatientId = '';
checkPopupPatientName = '';
checkPopupStatus: string = 'idle';

patientActivityStatuses: Map<string, any> = new Map();
activityLoading = false;

disconnectedPatients: Map<string, { name: string; since: Date }> = new Map();
disconnectPopup: { patientId: string; patientName: string; since: Date } | null = null;
pinnedDisconnects: Map<string, { patientName: string; since: Date }> = new Map();
private disconnectCheckInterval?: any;


  get isDoctor(): boolean {
    return this.userRole === 'doctor';
  }
  get isPatient(): boolean {
    return this.userRole === 'patient';
  }
  get isCaregiver(): boolean {
    return this.userRole === 'caregiver' || this.userRole === 'admin';
  }

  get alertHeroKicker(): string {
    if (this.isDoctor) return 'Clinical alert center';
    if (this.isPatient) return 'Personal safety hub';
    return 'Care monitoring center';
  }

  get alertHeroTitle(): string {
    if (this.isDoctor) return 'Patient Alerts & Incidents';
    if (this.isPatient) return 'Alerts & Incidents';
    return 'Care Monitoring Dashboard';
  }

  get alertHeroDescription(): string {
    if (this.isDoctor) {
      return 'Review patient incidents, prioritize clinical risk, and coordinate follow-up from one focused workspace.';
    }

    if (this.isPatient) {
      return 'Track your safety reports, view active alerts, and request help quickly when something feels wrong.';
    }

    return 'Monitor associated patients, manage incidents, and respond quickly with live activity context.';
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

  // Data from backend
  incidents: IncidentUI[] = [];
  alerts: AlertUI[] = [];

  // Selection
  selectedIncident: IncidentUI | null = null;
  selectedAlert: AlertUI | null = null;

  currentTime = new Date();
  private timerId?: any;
  private readonly isBrowser: boolean;
  private subscriptions: Subscription[] = [];

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    public readonly toastr: ToastrService,
    private authService: AuthService,
    private alertsService: AlertsService,
    private userService: UserService,
    private dialog: MatDialog,
    private alertScheduler: AlertSchedulerService,
    private voiceSos: VoiceSosService,
    private ngZone: NgZone ,
    private checkService: CheckService  // ADD THIS

  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

ngOnInit(): void {
  if (this.isBrowser) {
    this.timerId = setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  this.subscriptions.push(
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
      if (!user) return;

      this.userRole = user.role.toLowerCase() as any;

      // Populate IDs for voice-guided check
      this.currentUserId = user.userId!;

      if (this.isPatient) {
        this.patientId = user.userId!;
        const primaryEmail = user.caregiverEmails?.[0];
        if (primaryEmail) {
          this.userService.getUserByEmail(primaryEmail).subscribe(cg => {
            this.caregiverId = cg.userId;
          });
        }
      } else if (this.isCaregiver) {
        // Caregiver WebSocket connected per-patient inside the component itself
      }

      // Start voice SOS listener for patients — guarded to only run once
      if (this.isPatient && this.isBrowser && !this.voiceStarted) {
        this.voiceStarted = true;
        this.subscriptions.push(
          this.voiceSos.sosTrigger$.subscribe(() => {
            this.triggerSOS();
          })
        );
        this.voiceSos.start();
        this.voiceListening = true;
      }

      if (this.isDoctor) {
        this.loadDoctorPatients();
      }

      // For caregivers, load allowed patients first
      if (this.isCaregiver) {
        this.getConnectedPatients().subscribe(patients => {
          this.allowedPatientIds = new Set(patients.map(p => p.userId));
          this.loadData();
        });
      } else {
        // For patients or other roles: load data first
        this.loadData();
        // Then load EviCare insight if patient
        this.loadEviCareInsight();
      }

      // ← start auto-refresh for activity statuses
      this.startActivityRefresh();
    })
  );
}
/**
 * Load EviCare risk analysis for patient and show popup if needed
 */
private loadEviCareInsight(): void {
  if (!this.isPatient || !this.currentUser || !this.currentUser.userId) return;

  this.alertsService.getEviCareAnalysis(this.currentUser.userId).subscribe({
    next: (score) => {
      this.eviCareRiskScore = score;
      if (score.level !== 'LOW') {
        this.eviCarePopupVisible = true;
      }
    },
    error: () => {}
  });
}

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    if (this.sosCountdownTimer) clearInterval(this.sosCountdownTimer); // ← add this
    this.subscriptions.forEach(s => s.unsubscribe());
    this.voiceSos.stop();
    if (this.disconnectCheckInterval) clearInterval(this.disconnectCheckInterval);
    //this.checkService.disconnect(); // ADD THIS

  }

loadData(): void {
  if (!this.currentUser) return;

  this.alertsService.getIncidents().subscribe({
    next: (incidents: Incident[]) => {
      console.log('Incidents from backend:', incidents);

      // Role‑based filtering
      if (this.isPatient) {
        incidents = incidents.filter(i =>
          this.currentUser != null && (
            i.reportedByUserId === this.currentUser.userId ||
            i.patientId === this.currentUser.userId
          )
        );
      } else if (this.isCaregiver && this.allowedPatientIds) {
        incidents = incidents.filter(
          i => this.allowedPatientIds!.has(i.patientId)
        );
      } else if (this.isDoctor) {
        const doctorPatientIds = new Set(
          this.doctorPatients.map(p => p.userId)
        );
        incidents = incidents.filter(
          i => doctorPatientIds.has(i.patientId)
        );
      }

      this.incidents = incidents.map(i => this.enrichIncident(i));
      console.log('Mapped incidents:', this.incidents);

      const patientIds = [...new Set(incidents.map(i => i.patientId))];
      this.loadPatientDetails(patientIds);

      this.loadAlerts();

      // load patient activity statuses after incidents are ready
      this.loadPatientActivityStatuses();

      // start disconnect monitoring for caregivers and doctors
      this.startDisconnectCheck();
    },
    error: (err) => {
      console.error('Failed to load incidents', err);
      this.toastr.error('Could not load incidents');
    }
  });
}

 loadAlerts(): void {
  this.alertsService.getAlerts().subscribe({
    next: (alerts: Alert[]) => {
      console.log('Alerts loaded:', alerts);
      this.alerts = alerts.map(alert => this.enrichAlert(alert));
      this.startScheduler();
    },
    error: (err) => {
      console.error('Failed to load alerts', err);
      this.toastr.warning('Alerts could not be loaded');
    }
  });
}

  loadPatientDetails(patientIds: string[]): void {
  patientIds.forEach(id => {
    if (!this.patientCache.has(id)) {
      this.userService.getUserById(id).subscribe({
        next: (patient) => {
          this.patientCache.set(id, { 
            name: patient.name, 
            avatar: patient.profilePicture,
            email: patient.email      // add this
          });
          this.incidents = this.incidents.map(i =>
            i.patientId === id ? this.enrichIncident(i) : i
          );
        },
        error: (err) => console.error('Failed to load patient', err)
      });
    }
  });
}
  private enrichIncident(incident: Incident): IncidentUI {
  let patientName = 'Unknown patient';
  let patientAvatar = undefined;
  let patientEmail = undefined;   // add

  if (this.isPatient) {
    patientName = this.currentUser?.name ?? 'Me';
    patientAvatar = this.currentUser?.profilePicture;
    patientEmail = this.currentUser?.email;   // add
  } else {
    const cached = this.patientCache.get(incident.patientId);
    if (cached) {
      patientName = cached.name;
      patientAvatar = cached.avatar;
      patientEmail = cached.email;   // need to store email in cache
    } else {
      patientName = `Patient (${incident.patientId.substring(0, 6)})`;
    }
  }

  return {
    ...incident,
    incidentDate: (this.normalizeBackendDate(incident.incidentDate) ?? null) as any,
    patientName,
    patientAvatar,
    patientEmail,
    detectedBy: incident.reportedByUserId,
    comments: [],
    aiSuggestion: incident.aiSuggestion,
  };
}

  private enrichAlert(alert: Alert): AlertUI {
    return {
      ...alert,
      sentAt: (this.normalizeBackendDate(alert.sentAt) ?? null) as any,
      acknowledgedAt: (this.normalizeBackendDate(alert.acknowledgedAt) ?? null) as any,
    };
  }

  private normalizeBackendDate(value: unknown): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
      const millis = Math.floor(Number(nano) / 1_000_000);
      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        millis
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      if (/^\d{4},\d{1,2},\d{1,2}/.test(trimmed)) {
        return this.normalizeBackendDate(trimmed.split(',').map(part => Number(part.trim())));
      }

      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  private normalizeActivityStatus(status: any): any {
    if (!status) return status;

    return {
      ...status,
      lastLogin: this.normalizeBackendDate(status.lastLogin),
      recentLogins: Array.isArray(status.recentLogins)
        ? status.recentLogins.map((login: any) => ({
            ...login,
            loginAt: this.normalizeBackendDate(login.loginAt)
          }))
        : status.recentLogins
    };
  }

  // Fetch the list of patients connected to the current user (for caregivers/doctors)
  private getConnectedPatients(): Observable<Patient[]> {
    if (!this.currentUser) return of([]);

    let emailList: string[] = [];
    if (this.currentUser.role === 'CAREGIVER' || this.currentUser.role === 'DOCTOR') {
      emailList = this.currentUser.patientEmails || [];
    } else if (this.currentUser.role === 'PATIENT') {
      return of([]);
    }

    if (emailList.length === 0) return of([]);

    // Fetch each patient by email and map to Patient objects
    const requests = emailList.map(email =>
      this.userService.getUserByEmail(email).pipe(
        catchError(() => of(null))
      )
    );
    return forkJoin(requests).pipe(
      map(users => users.filter(u => u !== null) as Patient[])
    );
  }

  // ---------- Dialog openers ----------
  openCreateIncidentDialog(): void {
    if (this.isPatient && this.currentUser) {
      const dialogRef = this.dialog.open(AddIncidentDialogComponent, {
        width: '800px',
        maxWidth: '95vw',
        data: {}
      });
      this.handleIncidentDialogResult(dialogRef);
    } else if (this.isCaregiver) {
      this.getConnectedPatients().subscribe((patients: Patient[]) => {
        const dialogRef = this.dialog.open(AddIncidentDialogComponent, {
          width: '800px',
          maxWidth: '95vw',
          data: { allowedPatients: patients }
        });
        this.handleIncidentDialogResult(dialogRef);
      });
    }
  }

  private handleIncidentDialogResult(dialogRef: any) {
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.alertsService.createIncident(result).subscribe({
          next: () => {
            this.toastr.success('Incident created');
            this.loadData();
          },
          error: (err) => this.toastr.error('Failed to create incident')
        });
      }
    });
  }

  openEditIncidentDialog(incident: IncidentUI): void {
    // For editing, load all patients (or restrict to connected ones if desired)
    this.userService.getPatients().subscribe((patients: Patient[]) => {
      const dialogRef = this.dialog.open(AddIncidentDialogComponent, {
        width: '800px',
        maxWidth: '95vw',
        data: { incident, allowedPatients: patients }
      });
      dialogRef.afterClosed().subscribe((result: any) => {
        if (result) {
          this.alertsService.updateIncident(incident.incidentId, result).subscribe({
            next: (updated: Incident) => {
              const index = this.incidents.findIndex(i => i.incidentId === updated.incidentId);
              if (index !== -1) {
                this.incidents[index] = this.enrichIncident(updated);
              }
              this.toastr.success('Incident updated');
            },
            error: (err) => this.toastr.error('Failed to update incident')
          });
        }
      });
    });
  }

 openCreateAlertDialog(incident: IncidentUI): void {
  const dialogRef = this.dialog.open(AddAlertDialogComponent, {
    width: '600px',
    maxWidth: '95vw',
    data: { incident } // pass the whole incident
  });

  dialogRef.afterClosed().subscribe((result: any) => {
    if (result) {
      this.alertsService.createAlert(result).subscribe({
        next: (newAlert: Alert) => {
          this.alerts = [this.enrichAlert(newAlert), ...this.alerts];
          this.toastr.success('Alert created');
        },
        error: (err) => this.toastr.error('Failed to create alert')
      });
    }
  });
}

 openEditAlertDialog(incident: IncidentUI, alert: AlertUI): void {
  const dialogRef = this.dialog.open(AddAlertDialogComponent, {
    width: '600px',
    maxWidth: '95vw',
    data: { incident, alert }
  });

  dialogRef.afterClosed().subscribe((result: any) => {
    if (result) {
      this.alertsService.updateAlert(alert.alertId, result).subscribe({
        next: (updated: Alert) => {
          const idx = this.alerts.findIndex(a => a.alertId === updated.alertId);
          if (idx !== -1) {
            this.alerts[idx] = this.enrichAlert(updated);
          }
          this.toastr.success('Alert updated');
        },
        error: (err) => this.toastr.error('Failed to update alert')
      });
    }
  });
}

 deleteIncident(incident: IncidentUI): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '350px',
    data: { message: 'Delete this incident and all related alerts?' }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.alertsService.deleteIncident(incident.incidentId).subscribe({
        next: () => {
          this.incidents = this.incidents.filter(i => i.incidentId !== incident.incidentId);
          this.alerts = this.alerts.filter(a => a.incidentId !== incident.incidentId);

          if (this.selectedIncident?.incidentId === incident.incidentId) {
            this.selectedIncident = null;
            this.selectedAlert = null;
          }

          this.toastr.success('Incident deleted');
        },
        error: () => this.toastr.error('Failed to delete incident')
      });
    }
  });
}

 deleteAlert(alert: AlertUI): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '350px',
    data: { message: 'Delete this alert?' }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.alertsService.deleteAlert(alert.alertId).subscribe({
        next: () => {
          this.alerts = this.alerts.filter(a => a.alertId !== alert.alertId);

          if (this.selectedAlert?.alertId === alert.alertId) {
            this.selectedAlert = null;
          }

          this.toastr.success('Alert deleted');
        },
        error: () => this.toastr.error('Failed to delete alert')
      });
    }
  });
}

  acknowledgeAlert(alert: AlertUI): void {
    this.alertsService.acknowledgeAlert(alert.alertId).subscribe({
      next: (updated: Alert) => {
        const idx = this.alerts.findIndex(a => a.alertId === updated.alertId);
        if (idx !== -1) this.alerts[idx] = this.enrichAlert(updated);
        this.toastr.success('Alert acknowledged');
      },
      error: (err) => this.toastr.error('Failed to acknowledge alert')
    });
  }

  resolveAlert(alert: AlertUI): void {
    this.alertsService.resolveAlert(alert.alertId).subscribe({
      next: (updated: Alert) => {
        const idx = this.alerts.findIndex(a => a.alertId === updated.alertId);
        if (idx !== -1) this.alerts[idx] = this.enrichAlert(updated);
        this.toastr.success('Alert resolved');
      },
      error: (err) => this.toastr.error('Failed to resolve alert')
    });
  }

  // ---------- Filtering and pagination ----------
  get visibleAlerts(): AlertUI[] {
    const incidentIds = new Set((this.incidents ?? []).map(i => i.incidentId));
    const currentUserId = this.currentUser?.userId;

    if (this.isPatient && currentUserId) {
      return (this.alerts ?? []).filter(alert =>
        alert.targetId === currentUserId ||
        alert.senderId === currentUserId ||
        incidentIds.has(alert.incidentId)
      );
    }

    if (this.isDoctor && currentUserId) {
      return (this.alerts ?? []).filter(alert =>
        alert.targetId === currentUserId ||
        alert.senderId === currentUserId ||
        incidentIds.has(alert.incidentId)
      );
    }

    if (this.isCaregiver) {
      return (this.alerts ?? []).filter(alert => incidentIds.has(alert.incidentId));
    }

    return this.alerts ?? [];
  }

  get stats() {
  const alertsForStats = this.visibleAlerts;

  const incidentsForStats = this.isDoctor
    ? this.incidents.filter(i =>
        new Set(alertsForStats.map(a => a.incidentId)).has(i.incidentId)
      )
    : this.incidents;

  return {
    total: alertsForStats.length,
    active: incidentsForStats.filter(i => i.status === 'OPEN').length,
    acknowledged: incidentsForStats.filter(i => i.status === 'ACKNOWLEDGED').length,
    resolved: incidentsForStats.filter(i => i.status === 'RESOLVED').length,
    critical: incidentsForStats.filter(i =>
      (i.severity === 'CRITICAL' || i.severity === 'HIGH') && i.status === 'OPEN'
    ).length,
  };
}

  get filteredIncidents(): IncidentUI[] {
    let filtered = this.incidents ?? [];

    // Doctor restriction (already done in loadData? Actually loadData doesn't filter for doctors.
    // But we have the `targetIncidentIds` logic here, which is correct.)
    if (this.isDoctor && this.currentUser?.userId) {
      const targetIncidentIds = new Set(
        (this.alerts ?? [])
          .filter(a => a?.targetId === this.currentUser!.userId)
          .map(a => a?.incidentId)
      );
      filtered = filtered.filter(inc =>
        inc?.incidentId && targetIncidentIds.has(inc.incidentId)
      );
    }

    const search = (this.searchQuery ?? '').toLowerCase();

    return filtered.filter(incident => {
      const title = (incident?.title ?? '').toLowerCase();
      const patientName = (incident?.patientName ?? '').toLowerCase();
      const severity = incident?.severity ?? null;
      const type = incident?.type ?? null;
      const patientId = incident?.patientId ?? null;

      const matchesSearch =
        title.includes(search) ||
        patientName.includes(search);

      const matchesSeverity =
        this.filterSeverity === 'all' ||
        severity === this.filterSeverity;

      const matchesType =
        this.filterType === 'all' ||
        type === this.filterType;

      const matchesPatient =
        this.selectedPatientFilter === 'all' ||
        patientId === this.selectedPatientFilter;

      return matchesSearch && matchesSeverity && matchesType && matchesPatient;
    });
  }

  get totalIncidentPages(): number {
    return Math.max(1, Math.ceil(this.filteredIncidents.length / this.INCIDENTS_PER_PAGE));
  }

  get paginatedIncidents(): IncidentUI[] {
    const start = (this.incidentPage - 1) * this.INCIDENTS_PER_PAGE;
    return this.filteredIncidents.slice(start, start + this.INCIDENTS_PER_PAGE);
  }

  get alertsForSelectedIncident(): AlertUI[] {
    if (!this.selectedIncident) return [];
    return this.visibleAlerts.filter(a => a.incidentId === this.selectedIncident!.incidentId);
  }

  get totalAlertPages(): number {
    return Math.max(1, Math.ceil(this.alertsForSelectedIncident.length / this.ALERTS_PER_PAGE));
  }

  get paginatedAlerts(): AlertUI[] {
    const start = (this.alertsPage - 1) * this.ALERTS_PER_PAGE;
    return this.alertsForSelectedIncident.slice(start, start + this.ALERTS_PER_PAGE);
  }

  getFirstAlert(incidentId: string): AlertUI | undefined {
    return this.visibleAlerts.find(a => a.incidentId === incidentId);
  }

  selectIncident(incident: IncidentUI): void {
    this.selectedIncident = incident;
    this.selectedAlert = this.getFirstAlert(incident.incidentId) || null;
    this.alertsPage = 1;
  }

  previousIncidentPage(): void {
    if (this.incidentPage > 1) this.incidentPage--;
  }

  nextIncidentPage(): void {
    if (this.incidentPage < this.totalIncidentPages) this.incidentPage++;
  }

  previousAlertsPage(): void {
    if (this.alertsPage > 1) this.alertsPage--;
  }

  nextAlertsPage(): void {
    if (this.alertsPage < this.totalAlertPages) this.alertsPage++;
  }

  // ---------- Helpers for UI ----------
  getSeverityBadgeClasses(severity: Severity): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-[#C06C84] text-white';
      case 'HIGH': return 'bg-[#B39DDB] text-white';
      case 'MEDIUM': return 'bg-[#DCCEF9] text-[#7C3AED]';
      case 'LOW': return 'bg-[#A8E6CF] text-[#22c55e]';
    }
  }

  getStatusBadgeClasses(status: AlertStatus): string {
    switch (status) {
      case 'SENT': return 'bg-[#C06C84] text-white';
      case 'ACKNOWLEDGED': return 'bg-[#F59E0B] text-white';
      case 'RESOLVED': return 'bg-[#22c55e] text-white';
    }
  }

  getElapsedMinutes(date: Date): string {
    const diff = this.currentTime.getTime() - new Date(date).getTime();
    const minutes = Math.floor(Math.abs(diff) / 60000);
    const hours = Math.floor(minutes / 60);
    if (diff > 0) {
      if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
      return `in ${minutes}m`;
    }
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    return `${minutes}m ago`;
  }

  getInitials(name?: string): string {
    if (!name) return '';
    return name.split(' ').filter(p => p.length > 0).map(p => p[0]).join('');
  }

  getSeverityIcon(severity: Severity): string {
    return '';
  }

  getActivityLabel(status?: string): string {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'INACTIVE': return 'Inactive';
      case 'AT_RISK': return 'At Risk';
      case 'RECOVERED': return 'Recovered';
      case 'UNUSUAL': return 'Unusual';
      default: return 'Unknown';
    }
  }

  // Pagination helpers
  get currentPage(): number {
    return this.incidentPage;
  }

  get totalPages(): number {
    return this.totalIncidentPages;
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.incidentPage = page;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.incidentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.incidentPage++;
    }
  }

  // Load doctor's patients from patientEmails
loadDoctorPatients(): void {
  console.log('loadDoctorPatients called, currentUser:', this.currentUser);
  if (!this.currentUser || !this.currentUser.patientEmails) {
    console.log('No patientEmails in currentUser');
    return;
  }
  console.log('patientEmails:', this.currentUser.patientEmails);
  const emailList = this.currentUser.patientEmails;
  const requests = emailList.map(email =>
    this.userService.getUserByEmail(email).pipe(catchError(() => of(null)))
  );
  forkJoin(requests).pipe(map(users => users.filter(u => u !== null) as Patient[]))
    .subscribe(patients => {
      console.log('Loaded doctorPatients:', patients);
      this.doctorPatients = patients;
      if (patients.length) this.selectDoctorPatient(patients[0]);
    });
}

selectDoctorPatient(patient: Patient): void {
  this.selectedDoctorPatient = patient;
  // Filter incidents by this patient
}
get incidentsForSelectedPatient(): IncidentUI[] {
  return this.incidents.filter(i => i.patientId === this.selectedDoctorPatient?.userId);
}

getIncidentCountForPatient(patientId: string): number {
  return this.incidents.filter(i => i.patientId === patientId).length;
}

openIncidentDetailsDialog(incident: IncidentUI): void {
  this.dialog.open(IncidentDetailsDialogComponent, {
    width: '500px',
    data: { incident }
  });
}


private startScheduler(): void {
  if (!this.isBrowser || !this.isPatient) return;

  // Get caregiver phone: first caregiverEmail resolved to a user with phone
  let caregiverPhone = '';
  const caregiverEmails = this.currentUser?.caregiverEmails || [];

  const patientName = this.currentUser?.name || 'Patient';

  const doStart = (phone: string) => {
    this.alertScheduler.start(
      () => this.visibleAlerts,
      (incidentId: string) => {
        const inc = this.incidents.find(i => i.incidentId === incidentId);
        return inc?.title || 'Unknown incident';
      },
      phone,
      patientName
    );
  };

  if (caregiverEmails.length > 0) {
    this.userService.getUserByEmail(caregiverEmails[0]).subscribe({
      next: (caregiver) => {
        caregiverPhone = caregiver.phone || '';
        doStart(caregiverPhone);
      },
      error: () => doStart('')
    });
  } else {
    doStart('');
  }
}


onAlarmDismissed(alertId: any): void {
  this.alertsService.resolveAlert(alertId).subscribe({
    next: (updated: Alert) => {
      const idx = this.alerts.findIndex(a => a.alertId === updated.alertId);
      if (idx !== -1) this.alerts[idx] = this.enrichAlert(updated);
      this.toastr.success('Alert marked as complete');
    },
    error: () => this.toastr.error('Could not resolve alert')
  });
}

triggerSOS(): void {
  if (!this.currentUser) return;

  // Show popup immediately — don't wait for the API call
  this.showSosPopup();

  const caregiverEmails = this.currentUser.caregiverEmails || [];
  if (caregiverEmails.length === 0) {
    this.toastr.error('No caregiver connected to your account');
    return;
  }

  this.userService.getUserByEmail(caregiverEmails[0]).subscribe({
    next: (caregiver) => {
      if (!caregiver.phone) {
        this.toastr.error('Caregiver has no phone number on file');
        return;
      }

      this.alertsService.triggerSosCall({
        caregiverPhone: caregiver.phone,
        patientName: this.currentUser!.name,
        patientId: this.currentUser!.userId ?? ''
      }).subscribe({
        next: () => {
          this.toastr.success('SOS call triggered. Caregiver is being called now');
        },
        error: () => {
          this.toastr.error('Failed to trigger SOS call');
        }
      });
    },
    error: () => {
      this.toastr.error('Could not reach caregiver info');
    }
  });
}

private showSosPopup(): void {
  // Clear any existing countdown to prevent overlap
  if (this.sosCountdownTimer) {
    clearInterval(this.sosCountdownTimer);
    this.sosCountdownTimer = undefined;
  }

  this.sosPopupVisible = true;
  this.sosCountdown = 10;

  // Run outside Angular zone so setInterval doesn't trigger
  // constant change detection on every tick
  this.ngZone.runOutsideAngular(() => {
    this.sosCountdownTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.sosCountdown--;
        if (this.sosCountdown <= 0) {
          clearInterval(this.sosCountdownTimer);
          this.sosCountdownTimer = undefined;
          this.sosPopupVisible = false;
        }
      });
    }, 1000);
  });
}

acknowledgeIncident(incident: IncidentUI): void {
  this.alertsService.acknowledgeIncident(incident.incidentId).subscribe({
    next: (updated: Incident) => {
      const idx = this.incidents.findIndex(i => i.incidentId === updated.incidentId);
      if (idx !== -1) this.incidents[idx] = this.enrichIncident(updated);
      this.toastr.success('Incident acknowledged');
    },
    error: () => this.toastr.error('Failed to acknowledge incident')
  });
}

resolveIncident(incident: IncidentUI): void {
  this.alertsService.resolveIncident(incident.incidentId).subscribe({
    next: (updated: Incident) => {
      const idx = this.incidents.findIndex(i => i.incidentId === updated.incidentId);
      if (idx !== -1) this.incidents[idx] = this.enrichIncident(updated);
      this.toastr.success('Incident resolved');
    },
    error: () => this.toastr.error('Failed to resolve incident')
  });
}

openCheckPopup(incident: IncidentUI): void {
  this.checkPopupPatientId = incident.patientId;
  this.checkPopupPatientName = incident.patientName;
  this.checkPopupStatus = 'idle';
  this.checkPopupVisible = true;
}

closeCheckPopup(): void {
  this.checkPopupVisible = false;
}


loadPatientActivityStatuses(): void {
  if (!this.isCaregiver && !this.isDoctor) return;

  const patientIds = this.isDoctor
    ? this.doctorPatients.map(p => p.userId)
    : [...(this.allowedPatientIds || [])];

  if (patientIds.length === 0) return;

  this.activityLoading = true;
  this.alertsService.getBatchActivityStatus(patientIds).subscribe({
    next: (statuses) => {
      statuses
        .map(status => this.normalizeActivityStatus(status))
        .forEach(s => this.patientActivityStatuses.set(s.userId, s));
      this.activityLoading = false;
    },
    error: () => this.activityLoading = false
  });
}

getActivityStatus(patientId: string): any {
  return this.patientActivityStatuses.get(patientId);
}

private startActivityRefresh(): void {
  if (!this.isBrowser) return;
  setInterval(() => this.loadPatientActivityStatuses(), 120000);
}

getUniquePatientIds(): string[] {
  return [...new Set(this.incidents.map(i => i.patientId))];
}

getPatientNameById(patientId: string): string {
  const incident = this.incidents.find(i => i.patientId === patientId);
  return incident?.patientName || 'Unknown Patient';
}

private startDisconnectCheck(): void {
  if (!this.isBrowser || (!this.isCaregiver && !this.isDoctor)) return;

  const check = () => {
    const patientIds = this.isDoctor
      ? this.doctorPatients.map(p => p.userId)
      : [...(this.allowedPatientIds || [])];

    if (patientIds.length === 0) return;

    this.alertsService.getBatchActivityStatus(patientIds).subscribe({
      next: (statuses) => {
        statuses.map(status => this.normalizeActivityStatus(status)).forEach(s => {
          this.patientActivityStatuses.set(s.userId, s);
          const wasOnline = this.disconnectedPatients.has(s.userId) === false;
          const isOffline = !s.onlineNow;
          const alreadyPinned = this.pinnedDisconnects.has(s.userId);
          const popupOpen = this.disconnectPopup?.patientId === s.userId;

          if (isOffline && !alreadyPinned && !popupOpen) {
            const since = s.lastLogin ? new Date(s.lastLogin) : new Date();
            const name = this.getPatientNameById(s.userId);
            this.disconnectPopup = { patientId: s.userId, patientName: name, since };
          } else if (!isOffline) {
            // Patient came back online — remove pinned notification
            this.pinnedDisconnects.delete(s.userId);
            if (this.disconnectPopup?.patientId === s.userId) {
              this.disconnectPopup = null;
            }
          }
        });
      }
    });
  };

  check(); // immediate first check
  this.disconnectCheckInterval = setInterval(check, 30000); // every 30s
}

dismissDisconnectPopup(): void {
  if (!this.disconnectPopup) return;
  this.pinnedDisconnects.set(this.disconnectPopup.patientId, {
    patientName: this.disconnectPopup.patientName,
    since: this.disconnectPopup.since,
  });
  this.disconnectPopup = null;
}

closePinnedDisconnect(patientId: string): void {
  this.pinnedDisconnects.delete(patientId);
}

getPinnedDisconnectList(): { patientId: string; patientName: string; since: Date }[] {
  return [...this.pinnedDisconnects.entries()]
    .map(([patientId, v]) => ({ patientId, ...v }));
}

getMinutesSince(date: Date): string {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

formatDisconnectDate(date: Date): string {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
}
