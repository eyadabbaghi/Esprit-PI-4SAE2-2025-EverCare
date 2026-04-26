import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Incident, Alert } from '../model/alerts.models';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private baseUrl = 'http://localhost:8089/EverCare'; // gateway URL

  constructor(private http: HttpClient) {}

  // Incident endpoints
  createIncident(data: any): Observable<Incident> {
    return this.http.post<Incident>(`${this.baseUrl}/incidents`, data);
  }

  getIncidents(): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/incidents`);
  }

  getIncident(id: string): Observable<Incident> {
    return this.http.get<Incident>(`${this.baseUrl}/incidents/${id}`);
  }

  updateIncident(id: string, data: any): Observable<Incident> {
    return this.http.put<Incident>(`${this.baseUrl}/incidents/${id}`, data);
  }

  deleteIncident(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/incidents/${id}`);
  }

  resolveIncident(id: string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.baseUrl}/incidents/${id}/resolve`, {});
  }

  // Alert endpoints
  createAlert(data: any): Observable<Alert> {
    return this.http.post<Alert>(`${this.baseUrl}/alerts`, data);
  }

  getAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.baseUrl}/alerts`);
  }

  getAlertsByIncident(incidentId: string): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.baseUrl}/alerts/by-incident/${incidentId}`);
  }

  acknowledgeAlert(id: string): Observable<Alert> {
    return this.http.patch<Alert>(`${this.baseUrl}/alerts/${id}/acknowledge`, {});
  }

  resolveAlert(id: string): Observable<Alert> {
    return this.http.patch<Alert>(`${this.baseUrl}/alerts/${id}/resolve`, {});
  }

  deleteAlert(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/alerts/${id}`);
  }

  updateAlert(id: string, data: any): Observable<Alert> {
  return this.http.put<Alert>(`${this.baseUrl}/alerts/${id}`, data);
}

triggerSosCall(data: { caregiverPhone: string; patientName: string; patientId: string }): Observable<void> {
  return this.http.post<void>(`${this.baseUrl}/alerts/sos-call`, data);
}


getEviCareAnalysis(patientId: string): Observable<any> {
  return this.http.get(`${this.baseUrl}/evicare/analyse/${patientId}`);
}

acknowledgeIncident(id: string): Observable<Incident> {
  return this.http.patch<Incident>(`${this.baseUrl}/incidents/${id}/acknowledge`, {});
}

getPatientActivityStatus(userId: string): Observable<any> {
  return this.http.get(`http://localhost:8089/EverCare/users/activity/${userId}/status`);
}

getBatchActivityStatus(userIds: string[]): Observable<any[]> {
  return this.http.post<any[]>(
    `http://localhost:8089/EverCare/users/activity/batch-status`,
    userIds
  );
}
}