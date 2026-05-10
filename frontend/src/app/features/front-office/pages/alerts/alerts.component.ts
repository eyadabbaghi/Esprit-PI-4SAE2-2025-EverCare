import { Component, Inject, NgZone, OnDestroy, OnInit } from '@angular/core'; // ← add NgZone here
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { jsPDF } from 'jspdf';

import { AuthService, User } from '../../../../features/front-office/pages/login/auth.service';
import { AlertsService } from '../../../../core/services/alerts.service';
import { UserService, Patient } from '../../../../core/services/user.service';
import { AddIncidentDialogComponent } from '../../../../add-incident-dialog/add-incident-dialog.component';
import { AddAlertDialogComponent } from '../../../../add-alert-dialog/add-alert-dialog.component';
import { Incident, Alert, Severity, IncidentType, AlertStatus, DoctorRecommendation } from '../../../../core/model/alerts.models';
// At the top with other imports
import { IncidentDetailsDialogComponent } from './incident-details-dialog.component';
import { AlertSchedulerService } from '../../../../core/services/alert-scheduler.service';
import { CheckService } from './services/check.service';
import { ConfirmDialogComponent } from './components/confirm-dialog.component';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';
import { EvercareRuntimeService } from '../../../../core/services/evercare-runtime.service';
import { NotificationService } from '../../../../core/services/notification.service';

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

interface IncidentSlice {
  label: string;
  count: number;
  percent: number;
}

interface PatientIncidentAnalysis {
  total: number;
  active: number;
  resolved: number;
  critical: number;
  dominantType: string;
  dominantSeverity: string;
  riskiestLocation: string;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  summary: string;
  recommendations: string[];
  typeBreakdown: IncidentSlice[];
  severityBreakdown: IncidentSlice[];
  recentIncidents: IncidentUI[];
}

interface PreventionInsight {
  title: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  advice: string;
  total: number;
  recurring: number;
  missedAlerts: number;
  critical: number;
  dominantType: string;
  dominantSeverity: string;
  riskiestLocation: string;
  patternSummary: string;
  actions: string[];
  signals: string[];
}

interface DoctorRecommendationItem extends DoctorRecommendation {
  incidentTitle: string;
  incidentDescription: string;
  incidentSeverity: Severity;
  incidentType: IncidentType;
  patientName: string;
  patientAvatar?: string;
  patientId: string;
}

interface CachedPatient {
  name: string;
  avatar?: string;
  email?: string;
  doctorEmail?: string;
  doctorEmails?: string[];
  caregiverEmails?: string[];
}

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css'],
})
export class AlertsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  voiceListening = false;
  userRole: 'doctor' | 'caregiver' | 'patient' | 'admin' = 'caregiver';
  patientCache: Map<string, CachedPatient> = new Map();
  // For caregivers: set of patient IDs they are allowed to see
  allowedPatientIds: Set<string> | null = null;
// For doctors: list of patients they are connected to
doctorPatients: Patient[] = [];
selectedDoctorPatient: Patient | null = null;
caregiverPatients: Patient[] = [];
selectedCaregiverPatient: Patient | null = null;
caregiverPatientMenuOpen = false;
caregiverPatientLoading = false;
caregiverPatientReveal = false;
doctorActiveTab: 'incidents' | 'analysis' = 'incidents';
careViewTab: 'monitor' | 'prevention' | 'recommendations' = 'monitor';
doctorRecommendationText = '';
doctorRecommendationSubmitting = false;
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
pinnedDisconnectList: { patientId: string; patientName: string; since: Date }[] = [];
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
  aiInsightIncident: IncidentUI | null = null;
  aiInsightsLoading = false;
  aiInsightsError: string | null = null;

  currentTime = new Date();
  private timerId?: any;
  private readonly isBrowser: boolean;
  private subscriptions: Subscription[] = [];
  private schedulerCaregiverPhone = '';
  private schedulerPatientName = 'Patient';

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    public readonly toastr: ToastrService,
    private authService: AuthService,
    private alertsService: AlertsService,
    private userService: UserService,
    private dialog: MatDialog,
    private alertScheduler: AlertSchedulerService,
    private ngZone: NgZone ,
    private checkService: CheckService,  // ADD THIS
    private feedback: AppFeedbackService,
    private evercareRuntime: EvercareRuntimeService,
    private notificationService: NotificationService

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

      this.voiceListening = this.isPatient;

      // For caregivers, load allowed patients first
      if (this.isDoctor) {
        this.loadDoctorPatients(true);
      } else if (this.isCaregiver) {
        this.loadCaregiverPatients();
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
        this.maybeShowPreventionPopup(true);
      }
    },
    error: () => {}
  });
}

private maybeShowPreventionPopup(force = false): void {
  if (!this.currentUser || this.isDoctor) return;
  const insight = this.preventionInsight;
  if (!force && insight.level === 'LOW') return;

  const key = `evercare_prevention_popup:${this.currentUser.userId}`;
  const last = Number(localStorage.getItem(key) || 0);
  if (!force && Date.now() - last < 60 * 60 * 1000) return;

  this.eviCarePopupVisible = true;
  localStorage.setItem(key, String(Date.now()));
}

  ngOnDestroy(): void {
    if (this.timerId) clearInterval(this.timerId);
    if (this.sosCountdownTimer) clearInterval(this.sosCountdownTimer); // ← add this
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.disconnectCheckInterval) clearInterval(this.disconnectCheckInterval);
    //this.checkService.disconnect(); // ADD THIS

  }

loadData(showCaregiverLoading = false): void {
  if (!this.currentUser) return;

  if (showCaregiverLoading) {
    this.caregiverPatientLoading = true;
    this.caregiverPatientReveal = false;
  }

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
      this.syncCaregiverIncidentSelection();

      const patientIds = [...new Set(incidents.map(i => i.patientId))];
      this.loadPatientDetails(patientIds);

      this.loadAlerts(showCaregiverLoading);

      // load patient activity statuses after incidents are ready
      this.loadPatientActivityStatuses();

      // start disconnect monitoring for caregivers only
      this.startDisconnectCheck();
    },
    error: (err) => {
      console.error('Failed to load incidents', err);
      this.toastr.error('Could not load incidents');
      this.caregiverPatientLoading = false;
    }
  });
}

 loadAlerts(showCaregiverLoading = false): void {
  this.alertsService.getAlerts().subscribe({
    next: (alerts: Alert[]) => {
      console.log('Alerts loaded:', alerts);
      this.alerts = alerts.map(alert => this.enrichAlert(alert));
      if (this.selectedIncident) {
        this.selectedAlert = this.getFirstAlert(this.selectedIncident.incidentId) || null;
      }
      this.maybeShowPreventionPopup();
      if (showCaregiverLoading) {
        this.finishCaregiverPatientLoad();
      }
    },
    error: (err) => {
      console.error('Failed to load alerts', err);
      this.toastr.warning('Alerts could not be loaded');
      this.caregiverPatientLoading = false;
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
            email: patient.email,
            doctorEmail: patient.doctorEmail,
            caregiverEmails: patient.caregiverEmails || []
          });
          this.incidents = this.incidents.map(i =>
            i.patientId === id ? this.enrichIncident(i) : i
          );
          if (this.selectedIncident?.patientId === id) {
            this.selectedIncident = this.enrichIncident(this.selectedIncident);
          }
        },
        error: (err) => console.error('Failed to load patient', err)
      });
    }
  });
}

private cachePatients(patients: Patient[]): void {
  patients.forEach(patient => {
    if (!patient?.userId) return;
    this.patientCache.set(patient.userId, {
      name: patient.name || patient.email || 'Patient',
      avatar: patient.profilePicture,
      email: patient.email,
      doctorEmail: patient.doctorEmail,
      caregiverEmails: patient.caregiverEmails || []
    });
  });
}

private loadCaregiverPatients(): void {
  this.caregiverPatientLoading = true;
  this.getConnectedPatients().subscribe({
    next: (patients) => {
      this.caregiverPatients = patients;
      this.cachePatients(patients);
      this.allowedPatientIds = new Set(patients.map(p => p.userId));
      if (patients.length) {
        this.selectedCaregiverPatient = this.selectedCaregiverPatient
          ? patients.find(patient => patient.userId === this.selectedCaregiverPatient?.userId) || patients[0]
          : patients[0];
        this.selectedPatientFilter = this.selectedCaregiverPatient.userId;
      } else {
        this.selectedCaregiverPatient = null;
        this.selectedPatientFilter = 'all';
      }
      this.loadData(true);
    },
    error: () => {
      this.caregiverPatients = [];
      this.selectedCaregiverPatient = null;
      this.allowedPatientIds = new Set();
      this.caregiverPatientLoading = false;
      this.toastr.error('Could not load associated patients');
    }
  });
}

toggleCaregiverPatientMenu(): void {
  if (!this.caregiverPatients.length || this.caregiverPatientLoading) return;
  this.caregiverPatientMenuOpen = !this.caregiverPatientMenuOpen;
}

selectCaregiverPatient(patient: Patient): void {
  if (this.selectedCaregiverPatient?.userId === patient.userId && !this.caregiverPatientLoading) {
    this.caregiverPatientMenuOpen = false;
    return;
  }

  this.selectedCaregiverPatient = patient;
  this.selectedPatientFilter = patient.userId;
  this.selectedIncident = null;
  this.selectedAlert = null;
  this.incidentPage = 1;
  this.alertsPage = 1;
  this.caregiverPatientMenuOpen = false;
  this.loadData(true);
}

get selectedCaregiverPatientName(): string {
  return this.selectedCaregiverPatient?.name || this.selectedCaregiverPatient?.email || 'Select patient';
}

get selectedCaregiverPatientSubtitle(): string {
  if (!this.selectedCaregiverPatient) return `${this.caregiverPatients.length} associated patients`;
  const count = this.patientScopedIncidents.length;
  return `${count} incident${count !== 1 ? 's' : ''} tracked`;
}

get selectedCaregiverPatientAvatar(): string {
  return this.resolvePatientAvatar(this.selectedCaregiverPatient);
}

getCaregiverPatientIncidentCount(patient: Patient): number {
  return this.incidents.filter(incident => incident.patientId === patient.userId).length;
}

getCaregiverPatientOpenCount(patient: Patient): number {
  return this.incidents.filter(incident => incident.patientId === patient.userId && incident.status === 'OPEN').length;
}

resolvePatientAvatar(patient: Patient | null | undefined): string {
  const avatar = String(patient?.profilePicture || '').trim();
  if (!avatar) return '/assets/default-avatar.png';
  if (/^(https?:|data:|blob:)/i.test(avatar)) return avatar;
  if (avatar.startsWith('/')) return avatar;
  return `/${avatar}`;
}

private finishCaregiverPatientLoad(): void {
  this.caregiverPatientLoading = false;
  this.caregiverPatientReveal = true;
  setTimeout(() => this.caregiverPatientReveal = false, 700);
}

private syncCaregiverIncidentSelection(): void {
  if (!this.isCaregiver) return;
  const visible = this.patientScopedIncidents;
  if (!this.selectedIncident || !visible.some(incident => incident.incidentId === this.selectedIncident?.incidentId)) {
    this.selectedIncident = visible[0] || null;
    this.selectedAlert = this.selectedIncident ? this.getFirstAlert(this.selectedIncident.incidentId) || null : null;
  }
}

handleIncidentAvatarError(incident: IncidentUI): void {
  incident.patientAvatar = undefined;
}

handlePatientAvatarError(patient: Patient): void {
  patient.profilePicture = undefined;
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
    doctorRecommendations: (incident.doctorRecommendations || []).map(recommendation => ({
      ...recommendation,
      createdAt: (this.normalizeBackendDate(recommendation.createdAt) ?? null) as any,
    })),
    patientName,
    patientAvatar,
    patientEmail,
    detectedBy: incident.reportedByUserId,
    comments: [],
    aiSuggestion: incident.aiSuggestion,
  };
}

  private enrichAlert(alert: Alert): AlertUI {
    const scheduledTime = this.normalizeScheduledTime(alert.scheduledTime);
    return {
      ...alert,
      immediate: alert.immediate ?? !scheduledTime,
      scheduledTime,
      repeatDays: alert.repeatDays || [],
      notificationChannels: alert.notificationChannels || [],
      sentAt: (this.normalizeBackendDate(alert.sentAt) ?? null) as any,
      acknowledgedAt: (this.normalizeBackendDate(alert.acknowledgedAt) ?? null) as any,
    };
  }

  getAlertScheduleLabel(alert: AlertUI): string {
    if (alert.immediate !== false) {
      return 'Immediate alert';
    }

    const timeLabel = this.formatScheduleTime(alert.scheduledTime);
    const daysLabel = alert.repeatDays?.length ? ` - ${alert.repeatDays.join(', ')}` : '';
    return `${timeLabel}${daysLabel}`;
  }

  getInsightSummary(insight?: string): string {
    if (!insight) return 'AI insights available';
    const firstLine = insight.split(/\n+/).find(line => line.trim()) || insight;
    return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
  }

  openAiInsights(incident: IncidentUI, event?: Event): void {
    event?.stopPropagation();
    this.aiInsightsError = null;
    this.aiInsightIncident = {
      ...incident,
      aiSuggestion: incident.aiSuggestion || ''
    };

    if (incident.aiSuggestion) return;

    this.aiInsightsLoading = true;
    this.alertsService.generateAndSaveIncidentInsights(incident.incidentId).subscribe({
      next: (updated) => {
        const aiSuggestion = updated.aiSuggestion || '';
        this.aiInsightsLoading = false;
        this.aiInsightIncident = this.aiInsightIncident
          ? { ...this.aiInsightIncident, aiSuggestion }
          : null;
        incident.aiSuggestion = aiSuggestion;

        const index = this.incidents.findIndex(item => item.incidentId === incident.incidentId);
        if (index !== -1) {
          this.incidents[index] = this.enrichIncident(updated);
        }
        if (this.selectedIncident?.incidentId === incident.incidentId) {
          this.selectedIncident = this.enrichIncident(updated);
        }
      },
      error: (error) => {
        this.aiInsightsLoading = false;
        this.aiInsightsError = error?.error?.message || 'AI insights are temporarily unavailable. Please try again.';
      }
    });
  }

  closeAiInsights(): void {
    this.aiInsightIncident = null;
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

  private normalizeScheduledTime(value: string | null | undefined): string {
    if (!value) return '';
    const match = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  private formatScheduleTime(value: string | null | undefined): string {
    const normalized = this.normalizeScheduledTime(value);
    if (!normalized) return 'Scheduled';

    const [hourValue, minute] = normalized.split(':').map(Number);
    const period = hourValue >= 12 ? 'PM' : 'AM';
    const hour = hourValue % 12 || 12;
    return `Scheduled for ${hour}:${String(minute).padStart(2, '0')} ${period}`;
  }

  private generateIncidentInsights(incident: IncidentUI): string {
    const title = incident.title || '';
    const desc = incident.description || '';
    const text = `${title} ${desc}`.toLowerCase();
    const immediate: string[] = [];
    const prevention: string[] = [];
    const followUp: string[] = [];
    let recommendedSeverity = incident.severity || 'MEDIUM';

    const hasAny = (terms: string[]) => terms.some(term => text.includes(term));
    const raiseSeverity = (target: Severity) => {
      const order: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      recommendedSeverity = order.indexOf(target) > order.indexOf(recommendedSeverity as Severity)
        ? target
        : recommendedSeverity;
    };

    if (hasAny(['fall', 'fell', 'slip', 'tripped', 'head hit', 'hit head'])) {
      raiseSeverity('HIGH');
      immediate.push('Check for pain, dizziness, bleeding, confusion, or reduced mobility before moving the patient.');
      prevention.push('Remove floor clutter, improve lighting, check footwear, and review walking aids or bathroom safety rails.');
      followUp.push('Document where the fall happened and whether dizziness, rushing, or being alone contributed.');
    }

    if (hasAny(['medication', 'medicine', 'dose', 'pill', 'missed', 'overdose', 'wrong medication'])) {
      raiseSeverity('HIGH');
      immediate.push('Confirm the medication, dose, and timing before giving any extra dose; contact the doctor if unsure.');
      prevention.push('Use medication reminders, a labeled organizer, and a visible daily medication checklist.');
      followUp.push('Record medication name, dose, time, and symptoms after the incident.');
    }

    if (hasAny(['chest pain', 'breathing', 'breath', 'unconscious', 'seizure', 'stroke', 'bleeding', 'emergency'])) {
      recommendedSeverity = 'CRITICAL';
      immediate.push('Treat active or worsening symptoms as urgent and contact emergency care.');
      prevention.push('Keep emergency contacts visible and review the patient emergency plan with the care team.');
      followUp.push('Share symptoms, timing, medications, and vital signs with the clinical team.');
    }

    if (hasAny(['confused', 'wandering', 'agitated', 'aggression', 'memory', 'lost'])) {
      raiseSeverity('HIGH');
      immediate.push('Reduce stimulation, speak calmly, and guide the patient to a familiar safe place.');
      prevention.push('Identify triggers, keep routines consistent, and use safe-zone alerts when wandering risk is present.');
      followUp.push('Note the time of day, location, trigger, and what helped the patient settle.');
    }

    if (!immediate.length) {
      immediate.push('Check the patient calmly, confirm they are safe, and notify the appropriate caregiver or doctor if risk remains.');
      prevention.push('Look for patterns in time, location, activity, medication, and environment to reduce repeat incidents.');
      followUp.push('Add a clear alert, monitor for changes, and document any action already taken.');
    }

    return [
      `Recommended severity: ${recommendedSeverity}.`,
      `What to do now: ${immediate.join(' ')}`,
      `Prevention: ${prevention.join(' ')}`,
      `Follow-up notes: ${followUp.join(' ')}`
    ].join('\n\n');
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

    if (emailList.length === 0) {
      const caregiverEmail = String(this.currentUser.email || '').trim().toLowerCase();
      if (this.currentUser.role !== 'CAREGIVER' || !caregiverEmail) return of([]);

      return this.userService.getPatients().pipe(
        map(patients => (patients || []).filter(patient =>
          (patient.caregiverEmails || []).some(email => String(email || '').trim().toLowerCase() === caregiverEmail)
        )),
        catchError(() => of([]))
      );
    }

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
          next: (created: Incident) => {
            const enrichedIncident = this.enrichIncident(created);
            this.incidents = [
              enrichedIncident,
              ...this.incidents.filter(item => item.incidentId !== enrichedIncident.incidentId),
            ];
            this.notifyDoctorOfNewIncident(enrichedIncident);
            this.feedback.success('Incident created successfully.', 'Safety incident');
            this.loadData();
            this.evercareRuntime.refreshNow();
          },
          error: (err) => this.feedback.error('Could not create the incident. Please try again.', 'Safety incident')
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
              this.feedback.success('Incident updated successfully.', 'Safety incident');
              this.evercareRuntime.refreshNow();
            },
            error: (err) => this.feedback.error('Could not update the incident. Please try again.', 'Safety incident')
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
          const enrichedAlert = this.enrichAlert(newAlert);
          this.alerts = [enrichedAlert, ...this.alerts];
          if (enrichedAlert.immediate !== false) {
            this.fireImmediateAlert(enrichedAlert);
          }
          this.feedback.success('Alert created successfully.', 'Care alert');
          this.evercareRuntime.refreshNow();
        },
        error: (err) => this.feedback.error('Could not create the alert. Please try again.', 'Care alert')
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
          const enrichedAlert = this.enrichAlert(updated);
          const idx = this.alerts.findIndex(a => a.alertId === updated.alertId);
          if (idx !== -1) {
            this.alerts[idx] = enrichedAlert;
          }
          if (enrichedAlert.immediate !== false) {
            this.fireImmediateAlert(enrichedAlert);
          }
          this.feedback.success('Alert updated successfully.', 'Care alert');
          this.evercareRuntime.refreshNow();
        },
        error: (err) => this.feedback.error('Could not update the alert. Please try again.', 'Care alert')
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

          this.feedback.success('Incident deleted successfully.', 'Safety incident');
          this.evercareRuntime.refreshNow();
        },
        error: () => this.feedback.error('Could not delete the incident. Please try again.', 'Safety incident')
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

          this.feedback.success('Alert deleted successfully.', 'Care alert');
          this.evercareRuntime.refreshNow();
        },
        error: () => this.feedback.error('Could not delete the alert. Please try again.', 'Care alert')
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
  get patientScopedIncidents(): IncidentUI[] {
    if (this.isCaregiver && this.selectedCaregiverPatient?.userId) {
      return (this.incidents ?? []).filter(incident => incident.patientId === this.selectedCaregiverPatient?.userId);
    }

    return this.incidents ?? [];
  }

  get visibleAlerts(): AlertUI[] {
    const incidentIds = new Set(this.patientScopedIncidents.map(i => i.incidentId));
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

  const incidentsForStats = this.patientScopedIncidents;

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
    let filtered = this.patientScopedIncidents;

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

  get doctorRecommendationItems(): DoctorRecommendationItem[] {
    const source = this.isCaregiver ? this.patientScopedIncidents : (this.incidents || []);
    return source
      .flatMap(incident => (incident.doctorRecommendations || []).map(recommendation => ({
        ...recommendation,
        incidentTitle: incident.title,
        incidentDescription: incident.description,
        incidentSeverity: incident.severity,
        incidentType: incident.type,
        patientName: incident.patientName,
        patientAvatar: incident.patientAvatar,
        patientId: incident.patientId,
      })))
      .sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }

  getFirstAlert(incidentId: string): AlertUI | undefined {
    return this.visibleAlerts.find(a => a.incidentId === incidentId);
  }

  selectIncident(incident: IncidentUI): void {
    this.selectedIncident = incident;
    this.selectedAlert = this.getFirstAlert(incident.incidentId) || null;
    this.alertsPage = 1;
    if (this.isDoctor) {
      this.doctorRecommendationText = '';
    }
  }

  submitDoctorRecommendation(incident: IncidentUI): void {
    const recommendation = this.doctorRecommendationText.trim();
    if (!this.currentUser || !recommendation) {
      this.feedback.error('Write a recommendation before sending it.', 'Doctor recommendation');
      return;
    }

    this.doctorRecommendationSubmitting = true;
    this.alertsService.addDoctorRecommendation(incident.incidentId, {
      doctorId: this.currentUser.userId || this.currentUser.email,
      doctorName: this.currentUser.name || this.currentUser.email || 'Doctor',
      recommendation,
    }).subscribe({
      next: updated => {
        const enriched = this.enrichIncident(updated);
        const index = this.incidents.findIndex(item => item.incidentId === enriched.incidentId);
        if (index !== -1) {
          this.incidents[index] = enriched;
        }
        this.selectedIncident = enriched;
        this.doctorRecommendationText = '';
        this.doctorRecommendationSubmitting = false;
        this.notifyCareTeamOfDoctorRecommendation(enriched, recommendation);
        this.evercareRuntime.refreshNow();
        this.feedback.success('Recommendation sent to the patient and caregiver view.', 'Doctor recommendation');
      },
      error: () => {
        this.doctorRecommendationSubmitting = false;
        this.feedback.error('Could not send the recommendation. Please try again.', 'Doctor recommendation');
      }
    });
  }

  private notifyDoctorOfNewIncident(incident: IncidentUI): void {
    this.getPatientForNotification(incident.patientId).subscribe((patient) => {
      const cachedPatient = this.patientCache.get(incident.patientId);
      const targets = this.uniqueTargets([
        patient?.doctorEmail,
        ...(patient?.doctorEmails || []),
        cachedPatient?.doctorEmail,
        ...(cachedPatient?.doctorEmails || []),
      ]);
      if (!targets.length) return;

      this.sendNotificationSafely({
        activityId: `incident:${incident.incidentId}`,
        action: 'PATIENT_INCIDENT_CREATED',
        details: `${incident.patientName || patient?.name || 'An associated patient'} added a ${incident.severity.toLowerCase()} ${incident.type} incident: ${incident.title}.`,
        targetUserIds: targets,
      });
    });
  }

  private notifyCareTeamOfDoctorRecommendation(incident: IncidentUI, recommendation: string): void {
    this.getPatientForNotification(incident.patientId).subscribe((patient) => {
      const targets = this.uniqueTargets([
        patient?.userId,
        patient?.email,
        incident.patientId,
        incident.patientEmail,
        ...(patient?.caregiverEmails || this.patientCache.get(incident.patientId)?.caregiverEmails || []),
      ]);
      const doctorName = this.currentUser?.name || 'Your doctor';

      if (!targets.length) return;

      this.sendNotificationSafely({
        activityId: `doctor-recommendation:${incident.incidentId}:${Date.now()}`,
        action: 'DOCTOR_RECOMMENDATION',
        details: `${doctorName} added a recommendation for "${incident.title}": ${recommendation}`,
        targetUserIds: targets,
      });
    });
  }

  private getPatientForNotification(patientId: string): Observable<Patient | null> {
    if (!patientId) return of(null);

    if (this.currentUser?.role === 'PATIENT' && this.currentUser.userId === patientId) {
      return of(this.currentUser as Patient);
    }

    const selectedPatient = this.selectedDoctorPatient?.userId === patientId ? this.selectedDoctorPatient : null;
    const doctorPatient = selectedPatient || this.doctorPatients.find(patient => patient.userId === patientId);
    if (doctorPatient) {
      this.cachePatients([doctorPatient]);
      return of(doctorPatient);
    }

    const cached = this.patientCache.get(patientId);
    if (cached?.email && (cached.doctorEmail || cached.doctorEmails?.length || cached.caregiverEmails?.length)) {
      return of({
        userId: patientId,
        name: cached.name,
        email: cached.email,
        profilePicture: cached.avatar,
        doctorEmail: cached.doctorEmail,
        doctorEmails: cached.doctorEmails,
        caregiverEmails: cached.caregiverEmails,
      });
    }

    return this.userService.getUserById(patientId).pipe(
      map((patient) => {
        this.cachePatients([patient]);
        return patient;
      }),
      catchError(() => of(null)),
    );
  }

  private sendNotificationSafely(payload: {
    activityId: string;
    action: string;
    details: string;
    targetUserIds: string[];
  }): void {
    this.notificationService.sendNotification(payload).subscribe({
      error: (error) => console.warn('EverCare notification could not be sent', error),
    });
  }

  private uniqueTargets(targets: Array<string | undefined | null>): string[] {
    return Array.from(new Set(
      targets
        .filter((target): target is string => typeof target === 'string' && target.trim().length > 0)
        .map(target => target.trim()),
    ));
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
loadDoctorPatients(loadIncidentsAfter = false): void {
  console.log('loadDoctorPatients called, currentUser:', this.currentUser);
  if (!this.currentUser || !this.currentUser.patientEmails) {
    console.log('No patientEmails in currentUser');
    this.doctorPatients = [];
    this.selectedDoctorPatient = null;
    this.incidents = [];
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
      this.cachePatients(patients);
      if (patients.length) this.selectDoctorPatient(patients[0]);
      if (loadIncidentsAfter) {
        this.loadData();
      }
    });
}

selectDoctorPatient(patient: Patient): void {
  this.selectedDoctorPatient = patient;
  // Filter incidents by this patient
}
get incidentsForSelectedPatient(): IncidentUI[] {
  return this.incidents.filter(i => i.patientId === this.selectedDoctorPatient?.userId);
}

setDoctorTab(tab: 'incidents' | 'analysis'): void {
  this.doctorActiveTab = tab;
}

get selectedPatientAnalysis(): PatientIncidentAnalysis {
  return this.buildPatientIncidentAnalysis(this.selectedDoctorPatient);
}

get doctorAllIncidents(): IncidentUI[] {
  const patientIds = new Set(this.doctorPatients.map(patient => patient.userId));
  return this.incidents.filter(incident => patientIds.has(incident.patientId));
}

get doctorCommonIncidentStats(): IncidentSlice[] {
  return this.buildBreakdown(this.doctorAllIncidents, incident => incident.type);
}

get doctorSeverityStats(): IncidentSlice[] {
  return this.buildBreakdown(this.doctorAllIncidents, incident => incident.severity);
}

get doctorRiskSummary(): string {
  const incidents = this.doctorAllIncidents;
  if (!incidents.length) {
    return 'No incident behavior has been recorded yet for the associated patients.';
  }

  const highRisk = incidents.filter(incident => incident.severity === 'HIGH' || incident.severity === 'CRITICAL').length;
  const open = incidents.filter(incident => incident.status === 'OPEN').length;
  const dominantType = this.getTopLabel(incidents, incident => incident.type);
  const dominantLocation = this.getTopLabel(incidents, incident => incident.location || 'Unspecified');

  return `${dominantType} incidents are the most common pattern across associated patients, with ${highRisk} high-risk event${highRisk !== 1 ? 's' : ''} and ${open} open incident${open !== 1 ? 's' : ''}. The most repeated location context is ${dominantLocation}.`;
}

getDoctorPatientAnalysis(patient: Patient): PatientIncidentAnalysis {
  return this.buildPatientIncidentAnalysis(patient);
}

getBarWidth(slice: IncidentSlice): number {
  return Math.max(6, slice.percent);
}

async downloadPatientAnalysisPdf(): Promise<void> {
  if (!this.selectedDoctorPatient) {
    this.feedback.warning('Select a patient before exporting the analysis.', 'Analysis export');
    return;
  }

  const patient = this.selectedDoctorPatient;
  const analysis = this.selectedPatientAnalysis;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let y = 54;
  const logoDataUrl = await this.loadImageAsDataUrl('/logo.png');

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const writeText = (text: string, size = 10, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [55, 48, 92]) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text || '-', contentWidth);
    ensureSpace(lines.length * (size + 5));
    doc.text(lines, margin, y);
    y += lines.length * (size + 5);
  };

  doc.setFillColor(124, 58, 237);
  doc.roundedRect(margin, 34, contentWidth, 78, 16, 16, 'F');
  let titleX = margin + 18;
  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.circle(margin + 41, 73, 24, 'F');
    doc.addImage(logoDataUrl, 'PNG', margin + 22, 54, 38, 38);
    titleX = margin + 76;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text('EverCare Patient Incident Analysis', titleX, 66);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patient.name || patient.email || 'Patient'} - ${new Date().toLocaleDateString()}`, titleX, 91);
  y = 142;

  writeText('Smart AI Summary', 15, 'bold', [76, 29, 149]);
  writeText(analysis.summary, 10);
  y += 8;

  const stats = [
    ['Total incidents', analysis.total],
    ['Open follow-ups', analysis.active],
    ['High severity', analysis.critical],
    ['Risk level', analysis.riskLevel],
    ['Dominant type', analysis.dominantType],
    ['Repeated context', analysis.riskiestLocation]
  ];

  writeText('Clinical Snapshot', 14, 'bold', [76, 29, 149]);
  stats.forEach(([label, value]) => {
    writeText(`${label}: ${value}`, 10, 'bold');
  });
  y += 8;

  writeText('Recommendations', 14, 'bold', [76, 29, 149]);
  analysis.recommendations.forEach((recommendation, index) => {
    writeText(`${index + 1}. ${recommendation}`, 10);
  });
  y += 8;

  writeText('Incident Type Breakdown', 14, 'bold', [76, 29, 149]);
  if (analysis.typeBreakdown.length) {
    analysis.typeBreakdown.forEach(slice => writeText(`${slice.label}: ${slice.count} (${slice.percent}%)`, 10));
  } else {
    writeText('No type pattern detected yet.', 10);
  }
  y += 8;

  writeText('Severity Breakdown', 14, 'bold', [76, 29, 149]);
  if (analysis.severityBreakdown.length) {
    analysis.severityBreakdown.forEach(slice => writeText(`${slice.label}: ${slice.count} (${slice.percent}%)`, 10));
  } else {
    writeText('No severity pattern detected yet.', 10);
  }
  y += 8;

  writeText('Recent Incidents', 14, 'bold', [76, 29, 149]);
  if (analysis.recentIncidents.length) {
    analysis.recentIncidents.forEach(incident => {
      const incidentDate = this.normalizeBackendDate(incident.incidentDate);
      writeText(`${incident.title || incident.type} - ${incident.severity} - ${incident.location || 'Unspecified'} - ${incidentDate ? incidentDate.toLocaleString() : 'No date'}`, 10, 'bold');
      writeText(incident.description || 'No description provided.', 9);
      y += 4;
    });
  } else {
    writeText('No recent incidents recorded for this patient.', 10);
  }

  doc.save(`EverCare-${this.safeFileName(patient.name || patient.email || 'patient')}-incident-analysis.pdf`);
  this.feedback.success('Patient incident analysis PDF downloaded.', 'Analysis exported');
}

private loadImageAsDataUrl(src: string): Promise<string | null> {
  if (!this.isBrowser) return Promise.resolve(null);

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

private safeFileName(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'patient';
}

get preventionInsight(): PreventionInsight {
  const incidents = this.isPatient
    ? this.incidents.filter(incident => incident.patientId === this.currentUser?.userId || incident.reportedByUserId === this.currentUser?.userId)
    : this.patientScopedIncidents;
  const total = incidents.length;
  const open = incidents.filter(incident => incident.status === 'OPEN').length;
  const critical = incidents.filter(incident => incident.severity === 'HIGH' || incident.severity === 'CRITICAL').length;
  const missedAlerts = this.visibleAlerts.filter(alert => alert.status === 'SENT').length;
  const typeBreakdown = this.buildBreakdown(incidents, incident => incident.type);
  const severityBreakdown = this.buildBreakdown(incidents, incident => incident.severity);
  const locationBreakdown = this.buildBreakdown(incidents, incident => incident.location || 'Unspecified');
  const recurring = typeBreakdown.filter(slice => slice.count > 1).length + locationBreakdown.filter(slice => slice.count > 1).length;
  const dominantType = typeBreakdown[0]?.label || this.eviCareRiskScore?.dominantIncidentType || 'No pattern yet';
  const dominantSeverity = severityBreakdown[0]?.label || 'Stable';
  const riskiestLocation = locationBreakdown[0]?.label || this.eviCareRiskScore?.riskiestLocation || 'No repeated context';
  const level = this.resolvePreventionLevel(total, open, critical, missedAlerts, recurring);
  const subject = this.isCaregiver ? 'your associated patients' : 'your care routine';

  return {
    title: level === 'LOW' ? 'No urgent risk pattern detected' : 'Prevent the next incident before it happens',
    level,
    total,
    recurring,
    missedAlerts,
    critical,
    dominantType,
    dominantSeverity,
    riskiestLocation,
    advice: this.buildPreventionAdvice(subject, level, dominantType, riskiestLocation, missedAlerts, critical, open),
    patternSummary: this.buildPreventionPatternSummary(total, dominantType, dominantSeverity, riskiestLocation, recurring, missedAlerts),
    actions: this.buildPreventionActions(dominantType, riskiestLocation, missedAlerts, critical, open),
    signals: this.buildPreventionSignals(incidents, missedAlerts, recurring)
  };
}

private resolvePreventionLevel(
  total: number,
  open: number,
  critical: number,
  missedAlerts: number,
  recurring: number
): PreventionInsight['level'] {
  if (critical >= 3 || missedAlerts >= 4 || open >= 5) return 'CRITICAL';
  if (critical >= 1 || missedAlerts >= 2 || recurring >= 3 || open >= 3) return 'HIGH';
  if (total >= 2 || open >= 1 || recurring >= 1 || missedAlerts >= 1) return 'MEDIUM';
  return 'LOW';
}

private buildPreventionAdvice(
  subject: string,
  level: PreventionInsight['level'],
  dominantType: string,
  riskiestLocation: string,
  missedAlerts: number,
  critical: number,
  open: number
): string {
  if (level === 'LOW') {
    return `EverCare Prevention is watching ${subject}. Current signals look stable, but keeping routines, alerts, and incident notes updated will make predictions smarter.`;
  }

  const alertHint = missedAlerts > 0
    ? ` ${missedAlerts} alert${missedAlerts !== 1 ? 's are' : ' is'} still pending or missed, so alert follow-up should be reviewed.`
    : '';
  return `EverCare Prevention detected a ${level.toLowerCase()} risk pattern around ${dominantType.toLowerCase()} incidents, especially near ${riskiestLocation}. ${critical} serious event${critical !== 1 ? 's' : ''} and ${open} open follow-up${open !== 1 ? 's' : ''} suggest prevention should happen now.${alertHint}`;
}

private buildPreventionPatternSummary(
  total: number,
  dominantType: string,
  dominantSeverity: string,
  riskiestLocation: string,
  recurring: number,
  missedAlerts: number
): string {
  if (!total) {
    return 'No incidents are available yet. EverCare Prevention needs more incident and alert history to detect recurring behavior.';
  }

  return `${dominantType} is the strongest repeated incident signal, ${dominantSeverity} is the most common severity, and ${riskiestLocation} is the most repeated context. EverCare found ${recurring} recurring pattern group${recurring !== 1 ? 's' : ''} and ${missedAlerts} pending or missed alert${missedAlerts !== 1 ? 's' : ''}.`;
}

private buildPreventionActions(
  dominantType: string,
  riskiestLocation: string,
  missedAlerts: number,
  critical: number,
  open: number
): string[] {
  const actions = [
    `Review the routine before and after ${dominantType.toLowerCase()} events and note sleep, medication, meals, hydration, and mood changes.`,
    `Check ${riskiestLocation} for lighting, clutter, noise, supervision gaps, and objects that could trigger confusion or falls.`
  ];

  if (missedAlerts > 0) {
    actions.push('Resolve pending alerts and adjust reminder times so future alarms are noticed on time.');
  }

  if (critical > 0) {
    actions.push('Share repeated high-severity signals with the doctor before recommending new activities or schedule changes.');
  }

  if (open > 0) {
    actions.push('Close open incident follow-ups with the exact action taken, because unresolved incidents weaken future prevention.');
  }

  return actions;
}

private buildPreventionSignals(incidents: IncidentUI[], missedAlerts: number, recurring: number): string[] {
  const recent = [...incidents]
    .sort((left, right) => new Date(right.incidentDate).getTime() - new Date(left.incidentDate).getTime())
    .slice(0, 3)
    .map(incident => `${incident.title || incident.type} at ${incident.location || 'unspecified location'} (${incident.severity}).`);

  return [
    `${recurring} recurring pattern group${recurring !== 1 ? 's' : ''} detected across incident type and location.`,
    `${missedAlerts} pending or missed alert${missedAlerts !== 1 ? 's' : ''} may increase response delay.`,
    ...(recent.length ? recent : ['No recent incident examples are available yet.'])
  ];
}

private buildPatientIncidentAnalysis(patient: Patient | null): PatientIncidentAnalysis {
  const incidents = patient
    ? this.incidents.filter(incident => incident.patientId === patient.userId)
    : [];
  const total = incidents.length;
  const active = incidents.filter(incident => incident.status === 'OPEN').length;
  const resolved = incidents.filter(incident => incident.status === 'RESOLVED').length;
  const critical = incidents.filter(incident => incident.severity === 'CRITICAL' || incident.severity === 'HIGH').length;
  const dominantType = this.getTopLabel(incidents, incident => incident.type);
  const dominantSeverity = this.getTopLabel(incidents, incident => incident.severity);
  const riskiestLocation = this.getTopLabel(incidents, incident => incident.location || 'Unspecified');
  const riskLevel = this.resolveRiskLevel(total, active, critical);

  return {
    total,
    active,
    resolved,
    critical,
    dominantType,
    dominantSeverity,
    riskiestLocation,
    riskLevel,
    summary: this.buildSmartPatientSummary(patient, total, active, critical, dominantType, riskiestLocation, riskLevel),
    recommendations: this.buildSmartRecommendations(total, active, critical, dominantType, riskiestLocation),
    typeBreakdown: this.buildBreakdown(incidents, incident => incident.type),
    severityBreakdown: this.buildBreakdown(incidents, incident => incident.severity),
    recentIncidents: [...incidents]
      .sort((left, right) => new Date(right.incidentDate).getTime() - new Date(left.incidentDate).getTime())
      .slice(0, 3)
  };
}

private buildSmartPatientSummary(
  patient: Patient | null,
  total: number,
  active: number,
  critical: number,
  dominantType: string,
  riskiestLocation: string,
  riskLevel: PatientIncidentAnalysis['riskLevel']
): string {
  const patientName = patient?.name || 'This patient';
  if (!total) {
    return `${patientName} has no recorded incidents yet, so the current behavioral baseline is stable but still too sparse for pattern detection.`;
  }

  return `${patientName} currently trends at ${riskLevel.toLowerCase()} risk. ${dominantType} incidents appear most often, ${critical} event${critical !== 1 ? 's' : ''} were high severity, and ${active} incident${active !== 1 ? 's' : ''} still need follow-up. Repeated context around ${riskiestLocation} may deserve closer routine review.`;
}

private buildSmartRecommendations(
  total: number,
  active: number,
  critical: number,
  dominantType: string,
  riskiestLocation: string
): string[] {
  if (!total) {
    return [
      'Keep collecting incident reports so EverCare can build a meaningful behavioral baseline.',
      'Ask the caregiver to document time, location, trigger, and recovery action when an event happens.'
    ];
  }

  const recommendations = [
    `Review ${dominantType.toLowerCase()} triggers with the caregiver and compare them with daily routine changes.`,
    `Audit the environment around ${riskiestLocation} for lighting, noise, clutter, medication timing, and supervision gaps.`
  ];

  if (critical > 0) {
    recommendations.push('Prioritize a clinical follow-up for repeated high-severity or critical incidents.');
  }

  if (active > 0) {
    recommendations.push('Close the loop on open incidents before recommending new activity or medication adjustments.');
  }

  return recommendations;
}

private resolveRiskLevel(total: number, active: number, critical: number): PatientIncidentAnalysis['riskLevel'] {
  if (critical >= 3 || active >= 5) return 'Critical';
  if (critical >= 1 || active >= 3 || total >= 8) return 'High';
  if (active >= 1 || total >= 3) return 'Moderate';
  return 'Low';
}

private buildBreakdown(incidents: IncidentUI[], pickLabel: (incident: IncidentUI) => string): IncidentSlice[] {
  const total = incidents.length;
  const counts = incidents.reduce((acc, incident) => {
    const label = pickLabel(incident) || 'Unspecified';
    acc.set(label, (acc.get(label) || 0) + 1);
    return acc;
  }, new Map<string, number>());

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percent: total ? Math.round((count / total) * 100) : 0
    }))
    .sort((left, right) => right.count - left.count);
}

private getTopLabel(incidents: IncidentUI[], pickLabel: (incident: IncidentUI) => string): string {
  return this.buildBreakdown(incidents, pickLabel)[0]?.label || 'No pattern yet';
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
  this.schedulerPatientName = patientName;

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
        this.schedulerCaregiverPhone = caregiverPhone;
        doStart(caregiverPhone);
      },
      error: () => {
        this.schedulerCaregiverPhone = '';
        doStart('');
      }
    });
  } else {
    this.schedulerCaregiverPhone = '';
    doStart('');
  }
}

private fireImmediateAlert(alert: AlertUI): void {
  if (!this.isBrowser) return;

  this.alertScheduler.fireNow(
    alert,
    (incidentId: string) => this.getIncidentTitle(incidentId),
    this.schedulerCaregiverPhone,
    this.schedulerPatientName || this.currentUser?.name || 'Patient'
  );
}

private getIncidentTitle(incidentId: string): string {
  const inc = this.incidents.find(i => i.incidentId === incidentId);
  return inc?.title || 'Unknown incident';
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
  if (!this.isBrowser || !this.isCaregiver) return;
  if (this.disconnectCheckInterval) return;

  const check = () => {
    const patientIds = [...(this.allowedPatientIds || [])];

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
            if (this.pinnedDisconnects.delete(s.userId)) {
              this.refreshPinnedDisconnectList();
            }
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
  this.refreshPinnedDisconnectList();
  this.disconnectPopup = null;
}

closePinnedDisconnect(patientId: string): void {
  if (this.pinnedDisconnects.delete(patientId)) {
    this.refreshPinnedDisconnectList();
  }
}

trackPinnedDisconnect(_: number, pin: { patientId: string }): string {
  return pin.patientId;
}

private refreshPinnedDisconnectList(): void {
  this.pinnedDisconnectList = [...this.pinnedDisconnects.entries()]
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
