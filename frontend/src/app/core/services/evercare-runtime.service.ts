import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { forkJoin, of, Subject, Subscription, timer } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Alert, Incident } from '../model/alerts.models';
import { AlertsService } from './alerts.service';
import { AlertSchedulerService } from './alert-scheduler.service';
import { AppFeedbackService } from './app-feedback.service';
import { NotificationService } from './notification.service';
import { UserService, Patient } from './user.service';
import { VoiceSosService } from './voice-sos.service';
import { EmergencySosPopupService } from './emergency-sos-popup.service';
import { AuthService, User } from '../../features/front-office/pages/login/auth.service';
import { CheckService, CheckSignalMessage } from '../../features/front-office/pages/alerts/services/check.service';

export interface TrackingRuntimeAlert {
  patientId: string;
  patientName: string;
  message: string;
  riskScore: number;
  insideSafeZone: boolean;
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class EvercareRuntimeService implements OnDestroy {
  readonly trackingAlert$ = new Subject<TrackingRuntimeAlert>();

  private user: User | null = null;
  private incidents: Incident[] = [];
  private alerts: Alert[] = [];
  private patients: Patient[] = [];
  private patientCache = new Map<string, Patient>();
  private authSub?: Subscription;
  private refreshSub?: Subscription;
  private voiceSub?: Subscription;
  private patientVoiceGuideSub?: Subscription;
  private patientLocationInterval?: ReturnType<typeof setInterval>;
  private started = false;
  private sosInFlight = false;
  private readonly trackingApiBase = 'http://localhost:8089/tracking';
  private readonly trackingAlertCooldownMs = 5 * 60 * 1000;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly alertsService: AlertsService,
    private readonly scheduler: AlertSchedulerService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly voiceSos: VoiceSosService,
    private readonly sosPopup: EmergencySosPopupService,
    private readonly checkService: CheckService,
    private readonly feedback: AppFeedbackService
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.authSub = this.authService.currentUser$.subscribe(user => {
      this.user = user;
      this.stopRefresh();
      this.stopVoiceSos();
      this.stopPatientVoiceGuide();
      this.stopPatientLocationTracking();
      this.scheduler.stop();

      if (!user || user.role === 'ADMIN' || user.role === 'DOCTOR') return;

      if (user.role === 'PATIENT') {
        this.startVoiceSos();
        this.startPatientVoiceGuide();
        this.startPatientLocationTracking();
      }

      this.refreshNow();
      this.refreshSub = timer(15000, 15000).subscribe(() => this.refreshNow());
    });
  }

  private startVoiceSos(): void {
    this.voiceSub = this.voiceSos.sosTrigger$.subscribe(() => this.triggerPatientSos());
    this.voiceSos.start();
  }

  private stopVoiceSos(): void {
    this.voiceSub?.unsubscribe();
    this.voiceSub = undefined;
    this.voiceSos.stop();
    this.sosInFlight = false;
  }

  private startPatientVoiceGuide(): void {
    const patientId = String(this.user?.userId || this.user?.email || '').trim();
    if (!patientId || this.patientVoiceGuideSub) return;

    this.checkService.connect(patientId);
    this.patientVoiceGuideSub = this.checkService.signal$.subscribe(message => this.handlePatientVoiceGuide(message));
  }

  private stopPatientVoiceGuide(): void {
    if (!this.patientVoiceGuideSub) return;
    this.patientVoiceGuideSub.unsubscribe();
    this.patientVoiceGuideSub = undefined;
    this.checkService.disconnect();
  }

  private handlePatientVoiceGuide(message: CheckSignalMessage): void {
    if (message.type !== 'voice-guide' || !this.user || this.user.role !== 'PATIENT') return;
    const currentPatientIds = [
      this.user.userId,
      this.user.email,
      this.user.keycloakId
    ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean);

    const targetId = String(message.to || '').trim().toLowerCase();
    if (targetId && !currentPatientIds.includes(targetId)) return;

    const text = typeof message.payload?.text === 'string' ? message.payload.text.trim() : '';
    if (!text) return;

    this.playVoiceGuideChime();
    this.speakVoiceGuide(text);
  }

  private speakVoiceGuide(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  private playVoiceGuideChime(): void {
    if (typeof window === 'undefined') return;
    const AudioContextRef = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextRef) return;

    try {
      const audioContext = new AudioContextRef();
      const gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45);

      [660, 880].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + index * 0.12);
        oscillator.connect(gain);
        oscillator.start(audioContext.currentTime + index * 0.12);
        oscillator.stop(audioContext.currentTime + index * 0.12 + 0.18);
      });

      setTimeout(() => audioContext.close().catch(() => {}), 700);
    } catch {
    }
  }

  private startPatientLocationTracking(): void {
    this.stopPatientLocationTracking();
    this.publishCurrentPatientLocation();
    this.patientLocationInterval = setInterval(() => this.publishCurrentPatientLocation(), 30000);
  }

  private stopPatientLocationTracking(): void {
    if (!this.patientLocationInterval) return;
    clearInterval(this.patientLocationInterval);
    this.patientLocationInterval = undefined;
  }

  private publishCurrentPatientLocation(): void {
    if (!this.user || this.user.role !== 'PATIENT') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    const patientId = String(this.user.userId || this.user.email || '').trim();
    if (!patientId) return;

    navigator.geolocation.getCurrentPosition(
      position => {
        this.http.post(`${this.trackingApiBase}/location-pings`, {
          patientId,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }).subscribe({ error: () => {} });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 20000, timeout: 12000 }
    );
  }

  triggerPatientSos(): boolean {
    if (!this.user || this.user.role !== 'PATIENT' || this.sosInFlight) return false;
    this.sosInFlight = true;
    this.sosPopup.show();

    const caregiverEmail = this.user.caregiverEmails?.[0];
    if (!caregiverEmail) {
      this.feedback.error('No caregiver is connected to your account.', 'Emergency SOS');
      this.sosInFlight = false;
      return true;
    }

    this.userService.getUserByEmail(caregiverEmail).subscribe({
      next: caregiver => {
        if (!caregiver.phone) {
          this.feedback.error('Your caregiver has no phone number on file.', 'Emergency SOS');
          this.sosInFlight = false;
          return;
        }

        this.alertsService.triggerSosCall({
          caregiverPhone: caregiver.phone,
          patientName: this.user?.name || 'Patient',
          patientId: this.user?.userId || ''
        }).subscribe({
          next: () => {
            this.feedback.success('Emergency SOS triggered. Your caregiver is being called now.', 'Emergency SOS');
            setTimeout(() => this.sosInFlight = false, 6000);
          },
          error: () => {
            this.feedback.error('Could not trigger the emergency SOS call.', 'Emergency SOS');
            this.sosInFlight = false;
          }
        });
      },
      error: () => {
        this.feedback.error('Could not reach caregiver information.', 'Emergency SOS');
        this.sosInFlight = false;
      }
    });

    return true;
  }

  refreshNow(): void {
    if (!this.user || this.user.role === 'ADMIN' || this.user.role === 'DOCTOR') return;

    this.loadConnectedPatients().subscribe(patients => {
      this.patients = patients;
      this.patientCache = new Map(patients.map(patient => [patient.userId, patient]));

      forkJoin({
        incidents: this.alertsService.getIncidents().pipe(catchError(() => of([] as Incident[]))),
        alerts: this.alertsService.getAlerts().pipe(catchError(() => of([] as Alert[])))
      }).subscribe(({ incidents, alerts }) => {
        this.incidents = this.filterIncidentsForUser(incidents);
        this.alerts = this.filterAlertsForUser(alerts);
        if (this.user?.role === 'PATIENT') {
          this.scheduler.start(
            () => this.alerts,
            (incidentId: string) => this.getIncidentTitle(incidentId),
            this.getEmergencyPhone(),
            this.getRuntimePatientName()
          );
        } else {
          this.scheduler.stop();
        }
        this.sendPreventionNotificationIfNeeded();
        this.monitorCaregiverTracking();
      });
    });
  }

  private loadConnectedPatients() {
    if (!this.user) return of([] as Patient[]);

    const emails = this.user.role === 'CAREGIVER'
      ? this.user.patientEmails || []
      : [];

    if (!emails.length) {
      const caregiverEmail = String(this.user.email || '').trim().toLowerCase();
      if (this.user.role !== 'CAREGIVER' || !caregiverEmail) return of([] as Patient[]);

      return this.userService.getPatients().pipe(
        map(patients => (patients || []).filter(patient =>
          (patient.caregiverEmails || []).some(email => String(email || '').trim().toLowerCase() === caregiverEmail)
        )),
        catchError(() => of([] as Patient[]))
      );
    }

    return forkJoin(
      emails.map(email => this.userService.getUserByEmail(email).pipe(catchError(() => of(null))))
    ).pipe(map(users => users.filter(Boolean) as Patient[]));
  }

  private filterIncidentsForUser(incidents: Incident[]): Incident[] {
    if (!this.user) return [];
    if (this.user.role === 'PATIENT') {
      return incidents.filter(incident => incident.patientId === this.user?.userId || incident.reportedByUserId === this.user?.userId);
    }

    const patientIds = new Set(this.patients.map(patient => patient.userId));
    return incidents.filter(incident => patientIds.has(incident.patientId));
  }

  private filterAlertsForUser(alerts: Alert[]): Alert[] {
    if (!this.user) return [];
    const incidentIds = new Set(this.incidents.map(incident => incident.incidentId));
    return alerts.filter(alert =>
      alert.status !== 'RESOLVED' &&
      (alert.targetId === this.user?.userId || incidentIds.has(alert.incidentId))
    );
  }

  private getIncidentTitle(incidentId: string): string {
    return this.incidents.find(incident => incident.incidentId === incidentId)?.title || 'Care alert';
  }

  private getRuntimePatientName(): string {
    if (!this.user) return 'Patient';
    if (this.user.role === 'PATIENT') return this.user.name || 'Patient';
    return this.patients[0]?.name || 'Patient';
  }

  private getEmergencyPhone(): string {
    return this.user?.phone || '';
  }

  private monitorCaregiverTracking(): void {
    if (!this.user || this.user.role !== 'CAREGIVER' || this.patients.length === 0) return;

    this.patients.forEach(patient => {
      this.tryMonitorTrackingCandidate(patient, this.trackingPatientCandidates(patient), 0);
    });
  }

  private tryMonitorTrackingCandidate(patient: Patient, candidates: string[], index: number): void {
    if (index >= candidates.length) return;

    const candidate = candidates[index];
    this.http.get<any>(`${this.trackingApiBase}/location-pings/status/${encodeURIComponent(candidate)}`)
      .pipe(catchError(() => of(null)))
      .subscribe(status => {
        if (!status) {
          this.tryMonitorTrackingCandidate(patient, candidates, index + 1);
          return;
        }

        this.handleTrackingStatusForCaregiver(patient, status);
      });
  }

  private handleTrackingStatusForCaregiver(patient: Patient, status: any): void {
    const insideSafeZone = status?.insideSafeZone === true;
    const riskScore = Number(status?.riskScore || 0);
    const patientId = String(status?.patientId || patient.userId || patient.email || '').trim();
    if (!patientId || (insideSafeZone && riskScore < 70)) return;

    const cooldownKey = `tracking_safe_zone_alert:${this.user?.userId || this.user?.email}:${patientId}`;
    const lastAlertAt = Number(localStorage.getItem(cooldownKey) || '0');
    if (Date.now() - lastAlertAt < this.trackingAlertCooldownMs) return;
    localStorage.setItem(cooldownKey, String(Date.now()));

    const patientName = patient.name || patient.email || 'Patient';
    const message = insideSafeZone
      ? `${patientName} has a high tracking risk score (${riskScore}).`
      : `${patientName} is outside the safe zone. Immediate check recommended.`;

    const alert: TrackingRuntimeAlert = {
      patientId,
      patientName,
      message,
      riskScore,
      insideSafeZone,
      timestamp: status?.timestamp
    };

    this.trackingAlert$.next(alert);
    this.notificationService.sendNotification({
      activityId: `tracking-safe-zone:${patientId}:${Date.now()}`,
      action: 'TRACKING_SAFE_ZONE_ALERT',
      details: JSON.stringify({
        message,
        patientId,
        patientName,
        riskScore,
        insideSafeZone,
        timestamp: status?.timestamp
      }),
      targetUserIds: [this.user?.userId, this.user?.email].filter((value): value is string => !!value)
    }).subscribe({ error: () => {} });
  }

  private trackingPatientCandidates(patient: Patient): string[] {
    const seen = new Set<string>();
    return [patient.userId, patient.email, patient.name]
      .map(value => String(value || '').trim())
      .filter(value => {
        const key = value.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private sendPreventionNotificationIfNeeded(): void {
    if (!this.user) return;

    const highRisk = this.incidents.filter(incident => incident.severity === 'HIGH' || incident.severity === 'CRITICAL').length;
    const openIncidents = this.incidents.filter(incident => incident.status === 'OPEN').length;
    const missedAlerts = this.alerts.filter(alert => alert.status === 'SENT').length;
    const shouldNotify = highRisk > 0 || openIncidents >= 2 || missedAlerts >= 2;
    if (!shouldNotify) return;

    const key = `evercare_prevention_notice:${this.user.userId}`;
    const last = Number(localStorage.getItem(key) || 0);
    if (Date.now() - last < 6 * 60 * 60 * 1000) return;

    const details = this.user.role === 'CAREGIVER'
      ? `EverCare Prevention noticed ${openIncidents} open patient incident(s), ${highRisk} serious event(s), and ${missedAlerts} missed or pending alert(s). Review prevention insights.`
      : `EverCare Prevention noticed ${openIncidents} open incident(s), ${highRisk} serious event(s), and ${missedAlerts} missed or pending alert(s). Review prevention insights.`;

    this.notificationService.sendNotification({
      activityId: `evercare-prevention-${this.user.userId}`,
      action: 'EVERCARE_PREVENTION',
      details,
      targetUserIds: [this.user.userId!]
    }).subscribe({
      next: () => localStorage.setItem(key, String(Date.now())),
      error: () => {}
    });
  }

  private stopRefresh(): void {
    this.refreshSub?.unsubscribe();
    this.refreshSub = undefined;
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.stopRefresh();
    this.stopVoiceSos();
    this.stopPatientVoiceGuide();
    this.stopPatientLocationTracking();
  }
}
