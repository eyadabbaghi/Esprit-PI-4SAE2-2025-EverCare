import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { DailyTask } from '../models/daily-task.model';
import { PatientDashboardInsightsDTO } from '../models/patient-dashboard-insights';

// ✅ your alert model is in src/app/models/
import { DailyMeAlert } from '../../../models/dailyme-alert';

@Injectable({ providedIn: 'root' })
export class DailyTaskService {

  // ✅ Gateway / dailyme routes (keep consistent)
  private tasksUrl = 'http://localhost:8089/api/daily-tasks';
  private insightsUrl = 'http://localhost:8089/api/insights';

  // ✅ Alerts endpoint (same gateway)
  private alertsUrl = 'http://localhost:8089/api/dailyme-alerts';

  constructor(private http: HttpClient) {}

  // =========================
  // ✅ TASKS CRUD
  // =========================

  // ✅ ACTIVE tasks
  getTasksByPatient(patientId: string): Observable<DailyTask[]> {
    return this.http.get<DailyTask[]>(
      `${this.tasksUrl}/patient/${patientId}`,
      {
        headers: { 'Cache-Control': 'no-cache' },
        params: { _: Date.now().toString() }
      }
    );
  }

  // ✅ HISTORY tasks
  getHistoryByPatient(patientId: string): Observable<DailyTask[]> {
    return this.http.get<DailyTask[]>(
      `${this.tasksUrl}/patient/${patientId}/history`,
      {
        headers: { 'Cache-Control': 'no-cache' },
        params: { _: Date.now().toString() }
      }
    );
  }

  // ✅ INSIGHTS
  getPatientDashboardInsights(patientId: string): Observable<PatientDashboardInsightsDTO> {
    return this.http.get<PatientDashboardInsightsDTO>(
      `${this.insightsUrl}/patient/${patientId}/dashboard`,
      {
        headers: { 'Cache-Control': 'no-cache' },
        params: { _: Date.now().toString() }
      }
    );
  }

  // ✅ CREATE
  addTask(task: DailyTask): Observable<DailyTask> {
    const payload = this.fixPayload(task);
    return this.http.post<DailyTask>(this.tasksUrl, payload);
  }

  // ✅ UPDATE
  updateTask(task: DailyTask): Observable<DailyTask> {
    const payload = this.fixPayload(task);
    return this.http.put<DailyTask>(`${this.tasksUrl}/${task.id}`, payload);
  }

  // ✅ DELETE
  deleteTask(id: number): Observable<any> {
    return this.http.delete(`${this.tasksUrl}/${id}`, { responseType: 'text' });
  }

  // ✅ PATCH completed
  setCompleted(id: number, completed: boolean): Observable<DailyTask> {
    return this.http.patch<DailyTask>(`${this.tasksUrl}/${id}/completed`, { completed });
  }

  // =========================
  // ✅ ALERTS (DailyMe innovation)
  // =========================

  getDailyMeAlertsByPatient(patientId: string): Observable<DailyMeAlert[]> {
    return this.http.get<DailyMeAlert[]>(
      `${this.alertsUrl}/patient/${patientId}`,
      {
        headers: { 'Cache-Control': 'no-cache' },
        params: { _: Date.now().toString() }
      }
    );
  }

  getNewDailyMeAlerts(): Observable<DailyMeAlert[]> {
    return this.http.get<DailyMeAlert[]>(
      `${this.alertsUrl}/new`,
      {
        headers: { 'Cache-Control': 'no-cache' },
        params: { _: Date.now().toString() }
      }
    );
  }

  resolveDailyMeAlert(id: number): Observable<DailyMeAlert> {
    return this.http.patch<DailyMeAlert>(
      `${this.alertsUrl}/${id}/status`,
      { status: 'RESOLVED' }
    );
  }

  // =========================
  // ✅ HELPERS
  // =========================

  private fixPayload(task: DailyTask): DailyTask {
    return {
      ...task,
      scheduledTime: this.toHHmm(task.scheduledTime),
      taskType: (task.taskType || 'OTHER').toUpperCase() as any,
      title: (task.title || '').trim(),
      notes: task.notes || '',
      patientId: String(task.patientId || ''),
      completed: !!task.completed
    };
  }

  private toHHmm(time: string): string {
    if (!time) return '08:00';
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return time;

    const m = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2];
      const mod = m[3].toUpperCase();
      if (mod === 'PM' && h < 12) h += 12;
      if (mod === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${min}`;
    }
    return '08:00';
  }
}
