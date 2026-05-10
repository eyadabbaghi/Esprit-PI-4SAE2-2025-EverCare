import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';

export interface ScheduledAlertFire {
  alertId: string;
  label: string;
  incidentTitle: string;
  incidentId: string;
  caregiverPhone?: string;
  patientName?: string;
}

@Injectable({ providedIn: 'root' })
export class AlertSchedulerService implements OnDestroy {
  private intervalId: any;
  private readonly baseUrl = 'http://localhost:8089/EverCare';
  private readonly firedKeys = new Set<string>();

  // Components subscribe to this to know when an alert fires
  alertFired$ = new Subject<ScheduledAlertFire>();

  constructor(private http: HttpClient) {}

  fireNow(
    alert: any,
    getIncidentTitle: (incidentId: string) => string,
    caregiverPhone: string,
    patientName: string
  ): void {
    if (!alert?.alertId || alert.status === 'RESOLVED') return;

    this.alertFired$.next({
      alertId: alert.alertId,
      label: alert.label || 'Alert',
      incidentTitle: getIncidentTitle(alert.incidentId),
      incidentId: alert.incidentId,
      caregiverPhone,
      patientName,
    });
  }

  /**
   * Call this once after alerts are loaded.
   * alerts: the full alerts array from the backend
   * incidentMap: map of incidentId -> incidentTitle
   * caregiverPhone: phone number of the caregiver to SMS if unacknowledged
   * patientName: name of the patient for the SMS body
   */
  start(
    getAlerts: () => any[],
    getIncidentTitle: (incidentId: string) => string,
    caregiverPhone: string,
    patientName: string
  ): void {
    this.stop();
    const checkAlerts = () => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const todayDay = days[now.getDay()];

      const alerts = getAlerts();
      for (const alert of alerts) {
        const scheduledTime = this.normalizeScheduledTime(alert.scheduledTime);
        if (!scheduledTime) continue;
        if (alert.status === 'RESOLVED') continue;

        const timeMatch = scheduledTime === currentHHMM;
        const repeatDays = Array.isArray(alert.repeatDays)
          ? alert.repeatDays.filter(Boolean)
          : [];
        const dayMatch = repeatDays.length === 0 || repeatDays.includes(todayDay);
        const fireKey = `${alert.alertId}-${todayKey}-${currentHHMM}`;

        if (timeMatch && dayMatch && !this.firedKeys.has(fireKey)) {
          this.firedKeys.add(fireKey);
          this.alertFired$.next({
            alertId: alert.alertId,
            label: alert.label || 'Alert',
            incidentTitle: getIncidentTitle(alert.incidentId),
            incidentId: alert.incidentId,
            caregiverPhone,
            patientName,
          });
        }
      }

      this.pruneFiredKeys(todayKey);
    };

    checkAlerts();
    this.intervalId = setInterval(checkAlerts, 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private normalizeScheduledTime(value: string | null | undefined): string {
    if (!value) return '';
    const match = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  private pruneFiredKeys(todayKey: string): void {
    if (this.firedKeys.size < 500) return;
    for (const key of this.firedKeys) {
      if (!key.includes(`-${todayKey}-`)) {
        this.firedKeys.delete(key);
      }
    }
  }

  sendEmergencySms(payload: {
    alertId: string;
    caregiverPhone: string;
    patientName: string;
    alertLabel: string;
    incidentTitle: string;
  }) {
    return this.http.post(`${this.baseUrl}/alerts/emergency-sms`, payload);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
