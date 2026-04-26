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

  // Components subscribe to this to know when an alert fires
  alertFired$ = new Subject<ScheduledAlertFire>();

  constructor(private http: HttpClient) {}

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
    this.intervalId = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const todayDay = days[now.getDay()];

      const alerts = getAlerts();
      for (const alert of alerts) {
        if (!alert.scheduledTime) continue;
        if (alert.status === 'RESOLVED') continue;

        const timeMatch = alert.scheduledTime === currentHHMM;
        const dayMatch =
          !alert.repeatDays || alert.repeatDays.length === 0
            ? true
            : alert.repeatDays.includes(todayDay);

        if (timeMatch && dayMatch) {
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
    }, 60000); // check every minute
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
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