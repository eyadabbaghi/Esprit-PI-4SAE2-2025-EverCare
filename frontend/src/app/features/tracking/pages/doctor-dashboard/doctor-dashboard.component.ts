import { Component, OnDestroy, OnInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  DoctorPatientVm,
  TrackingAlertDto,
  TrackingDangerDurationDto,
  TrackingDashboardService,
  TrackingPingDto,
  TrackingStatus
} from '../../services/tracking-dashboard.service';
import { Patient, UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css']
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {

  patients: DoctorPatientVm[] = [];
  selectedPatient: DoctorPatientVm | null = null;
  history: TrackingPingDto[] = [];
  dangerDuration: TrackingDangerDurationDto | null = null;
  alerts: Array<{ label: string; severity: string; time: string; date: string }> = [];
  displayAlerts: Array<{ label: string; severity: string; time: string; date: string }> = [];
  statusMessage = '';
  chart: Chart | null = null;
  refreshInterval: any;
  private alertedIds = new Set<string>();
  private alertsPrimed = false;
  private criticalAlertAudio: HTMLAudioElement | null = null;

  constructor(
    private readonly trackingDashboardService: TrackingDashboardService,
    private readonly userService: UserService
  ) {}

  ngOnInit() {
    this.initializeAlertAudio();
    this.loadPatients();

    this.refreshInterval = setInterval(() => {
      this.loadPatients();
      if (this.selectedPatient) {
        this.loadSelectedPatientStatus();
        this.loadHistoryThenChart();
        this.loadBackendAlerts();
        this.loadDangerDuration();
      }
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.chart) this.chart.destroy();
  }

  // 🔥 SMART STATUS
  getStatus(p: any): TrackingStatus {
    return this.trackingDashboardService.getStatus(p);
  }

  getStatusClass(p: any): string {
    return this.getStatus(p).toLowerCase();
  }

  getPatientName(patient: DoctorPatientVm | null): string {
    const fullName = String(patient?.name || '').trim();
    if (fullName) return fullName;

    if (patient?.firstName && patient?.lastName) {
      return `${patient.firstName} ${patient.lastName}`;
    }

    if (patient?.patientId) {
      return `Patient ${(patient.patientId || '').toString().substring(0, 8)}`;
    }

    return 'Patient';
  }

  getPatientIdShort(patient: DoctorPatientVm | null): string {
    return (patient?.patientId || '').toString().substring(0, 8) || 'N/A';
  }

  hasLiveLocation(patient: Partial<TrackingPingDto> | null | undefined): boolean {
    return !!patient?.timestamp;
  }

  getLivePatientsCount(): number {
    return this.patients.filter((patient) => this.hasLiveLocation(patient)).length;
  }

  getCoordinatesLabel(patient: DoctorPatientVm | null): string {
    if (!this.hasLiveLocation(patient)) {
      return 'Waiting for live ping';
    }

    return `${Number(patient?.lat ?? 0).toFixed(3)}, ${Number(patient?.lng ?? 0).toFixed(3)}`;
  }

  getLastPingLabel(patient: DoctorPatientVm | null): string {
    if (!patient?.timestamp) {
      return 'No live ping yet';
    }

    return new Date(patient.timestamp).toLocaleString();
  }

  getZoneLabel(patient: DoctorPatientVm | null): string {
    if (!this.hasLiveLocation(patient)) {
      return 'Waiting for live ping';
    }

    return patient?.insideSafeZone ? 'Inside safe zone' : 'Outside safe zone';
  }

  getSeverityClass(severity?: string): string {
    return (severity || 'medium').toLowerCase();
  }

  getPatientCount(status: TrackingStatus): number {
    return this.patients.filter((patient) => (
      this.hasLiveLocation(patient) && this.getStatus(patient) === status
    )).length;
  }

  // 🔥 SMART MESSAGE
  getSmartMessage(p: any): string {
    if (!this.hasLiveLocation(p)) {
      return 'Waiting for first live location update';
    }

    const status = this.getStatus(p);

    if (p.insideSafeZone === false)
      return "🚨 Patient left safe zone — immediate attention required";

    if (status === 'DANGER')
      return "⚠️ High abnormal activity detected";

    if (status === 'WARNING')
      return "🟡 Slight irregular activity";

    return "✅ Patient is stable and safe";
  }

  // 🔥 TREND
  getTrend(): 'CRITICAL' | 'IMPROVING' | 'WORSENING' | 'STABLE' {
    const backendTrend = (this.selectedPatient?.trend || this.history[0]?.trend || '').toUpperCase();

    if (
      backendTrend === 'CRITICAL' ||
      backendTrend === 'WORSENING' ||
      backendTrend === 'IMPROVING' ||
      backendTrend === 'STABLE'
    ) {
      return backendTrend;
    }

    const currentRisk = this.selectedPatient?.riskScore ?? this.history[0]?.riskScore ?? 0;
    if (currentRisk >= 80) return 'CRITICAL';
    if (currentRisk >= 60) return 'WORSENING';
    if (currentRisk === 0) return 'STABLE';

    return 'STABLE';
  }

  getDangerDurationLabel(): string {
    const minutes = this.dangerDuration?.minutes ?? 0;
    return `${minutes} min`;
  }

  getDangerDurationLevel(): string {
    return (this.dangerDuration?.level || 'LOW').toUpperCase();
  }

  getDangerDurationLevelClass(): string {
    return this.getDangerDurationLevel().toLowerCase();
  }

  loadPatients() {
    const providerEmail = this.getProviderEmail();
    const providerRole = this.getProviderRole();

    forkJoin({
      trackedPatients: this.trackingDashboardService.getLatestPatients().pipe(
        catchError((error) => {
          console.error('failed loading tracked patients', error);
          return of([] as DoctorPatientVm[]);
        })
      ),
      directoryPatients: this.userService.getLinkedPatientsForProvider(providerEmail, providerRole).pipe(
        catchError((error) => {
          console.error('failed loading patient directory', error);
          return of([] as Patient[]);
        })
      )
    }).subscribe({
      next: ({ trackedPatients, directoryPatients }) => {
        const linkedPatientIds = new Set(
          (directoryPatients || []).map((patient) => patient.userId).filter(Boolean)
        );
        const relevantTrackedPatients = linkedPatientIds.size
          ? trackedPatients.filter((patient) => linkedPatientIds.has(patient.patientId))
          : trackedPatients;
        const patients = directoryPatients.length
          ? this.mergePatients(directoryPatients, relevantTrackedPatients)
          : relevantTrackedPatients;

        if (!patients.length) {
          this.patients = [];
          this.selectedPatient = null;
          this.displayAlerts = [];
          this.statusMessage = providerEmail
            ? 'No linked patients found yet.'
            : 'Waiting for patient data...';
          return;
        }

        this.patients = patients.map((patient) => ({
          ...patient,
          status: this.getStatus(patient)
        }));

        if (this.selectedPatient?.patientId) {
          const refreshedSelectedPatient = this.patients.find(
            (patient) => patient.patientId === this.selectedPatient?.patientId
          );

          this.selectedPatient = refreshedSelectedPatient || null;
        }

        if (!this.selectedPatient) {
          this.selectPatient(this.patients[0]);
          return;
        }

        this.updateStatusMessage();
      }
    });
  }

  selectPatient(patient: DoctorPatientVm) {
    this.selectedPatient = patient;
    this.alerts = [];
    this.alertedIds.clear();
    this.alertsPrimed = false;
    this.updateStatusMessage();
    this.updateDisplayedAlerts();
    this.loadSelectedPatientStatus();
    this.loadHistoryThenChart();
    this.loadBackendAlerts();
    this.loadDangerDuration();
  }

  loadSelectedPatientStatus() {
    if (!this.selectedPatient) return;

    this.trackingDashboardService.getPatientStatus(this.selectedPatient.patientId).subscribe({
      next: (patientStatus) => {

        if (!patientStatus) return;

        const updated = {
          ...patientStatus,
          status: this.getStatus(patientStatus)
        };

        this.selectedPatient = updated;

        this.patients = this.patients.map(p =>
          p.patientId === updated.patientId ? updated : p
        );

        this.updateStatusMessage();
        this.updateDisplayedAlerts(this.alertsPrimed);
      }
    });
  }

  loadHistoryThenChart() {
    if (!this.selectedPatient) return;

    this.trackingDashboardService.getPatientHistory(this.selectedPatient.patientId).subscribe({
      next: (history) => {

        this.history = history.sort(
          (a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime()
        );

        this.buildChart();
      }
    });
  }

  loadBackendAlerts() {
    if (!this.selectedPatient) return;

    this.trackingDashboardService.getPatientAlerts(this.selectedPatient.patientId).subscribe({
      next: (data: TrackingAlertDto[]) => {

        this.alerts = data.map(a => ({
          label: a.message || a.text || 'Alert',
          severity: this.getSeverityClass(a.severity || 'medium'),
          time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : (a.time || 'N/A'),
          date: a.timestamp ? new Date(a.timestamp).toLocaleDateString() : (a.date || 'N/A')
        }));
        this.updateDisplayedAlerts(this.alertsPrimed);
        this.alertsPrimed = true;
      }
    });
  }

  loadDangerDuration() {
    if (!this.selectedPatient) return;

    this.trackingDashboardService.getDangerDuration(this.selectedPatient.patientId).subscribe({
      next: (dangerDuration) => {
        this.dangerDuration = dangerDuration;
      }
    });
  }

  buildChart() {
    if (this.chart) this.chart.destroy();

    const canvas = document.getElementById('chart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const statusClass = this.selectedPatient ? this.getStatus(this.selectedPatient) : 'SAFE';
    const strokeColor =
      statusClass === 'DANGER' ? '#dc2626' :
      statusClass === 'WARNING' ? '#d97706' :
      '#0f766e';
    const fillColor = ctx?.createLinearGradient(0, 0, 0, 320);

    fillColor?.addColorStop(0, `${strokeColor}66`);
    fillColor?.addColorStop(1, `${strokeColor}05`);

    const riskSeries = this.history
      .slice(0, 10)
      .map(h => h.riskScore ?? 0)
      .reverse();

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: riskSeries.map((_, i) => `T${i + 1}`),
        datasets: [{
          label: 'Risk Score',
          data: riskSeries,
          borderColor: strokeColor,
          backgroundColor: fillColor || `${strokeColor}22`,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: strokeColor,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b' }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(148, 163, 184, 0.15)' }
          }
        }
      }
    });
  }

  private updateStatusMessage() {
    if (!this.selectedPatient) return;
    this.statusMessage = this.getSmartMessage(this.selectedPatient);
  }

  private syncAlertFeedback(enableSound = false) {
    const currentAlertKeys = this.displayAlerts.map((alert) => this.getAlertKey(alert));
    const hasNewCriticalAlert = enableSound && this.displayAlerts.some((alert) => (
      this.getSeverityClass(alert.severity) === 'critical' &&
      !this.alertedIds.has(this.getAlertKey(alert))
    ));

    currentAlertKeys.forEach((alertKey) => this.alertedIds.add(alertKey));

    if (hasNewCriticalAlert) {
      this.playCriticalAlertSound();
    }
  }

  private getAlertKey(alert: { label: string; severity: string; time: string; date: string }) {
    return [
      this.selectedPatient?.patientId || 'unknown',
      this.getSeverityClass(alert.severity),
      alert.label,
      alert.date,
      alert.time
    ].join('|');
  }

  private initializeAlertAudio() {
    if (typeof Audio === 'undefined') return;

    this.criticalAlertAudio = new Audio('assets/alert.wav');
    this.criticalAlertAudio.preload = 'auto';
    this.criticalAlertAudio.volume = 0.45;
  }

  private playCriticalAlertSound() {
    if (!this.criticalAlertAudio) return;

    this.criticalAlertAudio.currentTime = 0;
    const playPromise = this.criticalAlertAudio.play();
    playPromise?.catch((error) => {
      console.log('critical alert sound blocked', error);
    });
  }

  private updateDisplayedAlerts(enableSound = false) {
    if (!this.selectedPatient) {
      this.displayAlerts = [];
      return;
    }

    if (this.alerts.length > 0) {
      this.displayAlerts = [...this.alerts];
      this.syncAlertFeedback(enableSound);
      return;
    }

    if (this.getStatus(this.selectedPatient) === 'DANGER') {
      this.displayAlerts = [{
        label: 'Patient currently in danger',
        severity: 'critical',
        time: this.selectedPatient.timestamp
          ? new Date(this.selectedPatient.timestamp).toLocaleTimeString()
          : new Date().toLocaleTimeString(),
        date: this.selectedPatient.timestamp
          ? new Date(this.selectedPatient.timestamp).toLocaleDateString()
          : new Date().toLocaleDateString()
      }];
      this.syncAlertFeedback(enableSound);
      return;
    }

    this.displayAlerts = [];
    this.syncAlertFeedback(enableSound);
  }

  private mergePatients(directoryPatients: Patient[], trackedPatients: DoctorPatientVm[]): DoctorPatientVm[] {
    const trackedById = new Map<string, DoctorPatientVm>();

    trackedPatients.forEach((patient) => {
      if (patient?.patientId) {
        trackedById.set(patient.patientId, patient);
      }
    });

    const knownPatientIds = new Set<string>();
    const mergedDirectoryPatients = (directoryPatients || [])
      .filter((patient) => !!patient?.userId)
      .map((patient) => {
        knownPatientIds.add(patient.userId);
        const trackedPatient = trackedById.get(patient.userId);
        return trackedPatient
          ? this.applyPatientIdentity(trackedPatient, patient)
          : this.toPatientPlaceholder(patient);
      });

    const trackedOnlyPatients = trackedPatients.filter(
      (patient) => patient?.patientId && !knownPatientIds.has(patient.patientId)
    );

    return [...mergedDirectoryPatients, ...trackedOnlyPatients].sort((left, right) => {
      const liveDelta = this.toTimestamp(right.timestamp) - this.toTimestamp(left.timestamp);
      if (liveDelta !== 0) {
        return liveDelta;
      }

      return this.getPatientName(left).localeCompare(this.getPatientName(right));
    });
  }

  private applyPatientIdentity(trackedPatient: DoctorPatientVm, patient: Patient): DoctorPatientVm {
    const name = String(patient.name || trackedPatient.name || patient.email || '').trim();
    const { firstName, lastName } = this.splitName(name);

    return {
      ...trackedPatient,
      name: name || trackedPatient.name,
      firstName: firstName || trackedPatient.firstName,
      lastName: lastName || trackedPatient.lastName
    };
  }

  private toPatientPlaceholder(patient: Patient): DoctorPatientVm {
    const name = String(patient.name || patient.email || '').trim() || `Patient ${patient.userId}`;
    const { firstName, lastName } = this.splitName(name);

    return {
      patientId: patient.userId,
      lat: 0,
      lng: 0,
      name,
      firstName,
      lastName,
      status: 'SAFE',
      riskScore: 0
    };
  }

  private splitName(name: string): { firstName?: string; lastName?: string } {
    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length <= 1) {
      return { firstName: parts[0] };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  private toTimestamp(value?: string): number {
    if (!value) {
      return 0;
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getProviderEmail(): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('current_user') || '{}');
      return String(storedUser?.email || '').trim().toLowerCase();
    } catch {
      return '';
    }
  }

  private getProviderRole(): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('current_user') || '{}');
      return String(storedUser?.role || '').trim().toUpperCase();
    } catch {
      return '';
    }
  }
}
