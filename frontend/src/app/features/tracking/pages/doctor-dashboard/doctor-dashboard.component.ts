import { Component, OnDestroy, OnInit } from '@angular/core';
import Chart from 'chart.js/auto';
import {
  DoctorPatientVm,
  TrackingAlertDto,
  TrackingDangerDurationDto,
  TrackingDashboardService,
  TrackingPingDto,
  TrackingStatus
} from '../../services/tracking-dashboard.service';

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

  constructor(private readonly trackingDashboardService: TrackingDashboardService) {}

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

  getSeverityClass(severity?: string): string {
    return (severity || 'medium').toLowerCase();
  }

  getPatientCount(status: TrackingStatus): number {
    return this.patients.filter((patient) => this.getStatus(patient) === status).length;
  }

  // 🔥 SMART MESSAGE
  getSmartMessage(p: any): string {
    const status = this.getStatus(p);

    if (!p.insideSafeZone)
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
    this.trackingDashboardService.getLatestPatients().subscribe({
      next: (patients) => {

        if (!patients || patients.length === 0) {
          this.patients = [];
          this.selectedPatient = null;
          this.displayAlerts = [];
          this.statusMessage = 'Waiting for patient data...';
          return;
        }

        this.patients = patients.map(p => ({
          ...p,
          status: this.getStatus(p)
        }));

        if (!this.selectedPatient) {
          this.selectPatient(this.patients[0]);
        }
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
}
