import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  id: string;
  activityId: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'PRE_CONSULTATION_FORM' | string;
  details: string;
  timestamp: string;
  read?: boolean;
  targetUserIds?: string[];
}

export interface NotificationRequest {
  activityId: string;
  action: string;
  details?: string;
  targetUserIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8089/EverCare/api/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  sendNotification(payload: NotificationRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/send`, payload);
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'CREATED': 'Created',
      'UPDATED': 'Updated',
      'DELETED': 'Deleted',
      'PRE_CONSULTATION_FORM': 'Submit Clinical Data',
      'ALERT_CREATED': 'Incident Alert',
      'USER_ASSOCIATED': 'New Care Connection',
      'USER_DISASSOCIATED': 'Care Connection Removed',
      'ROUTINE_ASSIGNED': 'Routine Assigned',
      'ROUTINE_REMINDER': 'Routine Reminder',
      'ROUTINE_COMPLETED': 'Routine Checked',
      'ROUTINE_PENDING': 'Routine Pending',
      'EVERCARE_PREVENTION': 'EverCare Prevention',
      'PATIENT_INCIDENT_CREATED': 'New Patient Incident',
      'DOCTOR_RECOMMENDATION': 'Doctor Recommendation',
      'TRACKING_SAFE_ZONE_ALERT': 'Tracking Safe-Zone Alert',
      'PRESCRIPTION_DAILY_SCHEDULE': 'Medication Schedule'
    };
    return labels[action] || action;
  }

  getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      'CREATED': '📝',
      'UPDATED': '✏️',
      'DELETED': '🗑️',
      'PRE_CONSULTATION_FORM': '📊'
    };
    return icons[action] || '🔔';
  }

  getActionColor(action: string): string {
    const colors: Record<string, string> = {
      'CREATED': 'text-green-600 bg-green-50',
      'UPDATED': 'text-blue-600 bg-blue-50',
      'DELETED': 'text-red-600 bg-red-50',
      'PRE_CONSULTATION_FORM': 'text-[#7C3AED] bg-[#F3E8FF]',
      'ALERT_CREATED': 'text-rose-700 bg-rose-50',
      'USER_ASSOCIATED': 'text-[#6D28D9] bg-[#F5F0FF]',
      'USER_DISASSOCIATED': 'text-[#6D28D9] bg-[#F5F0FF]',
      'ROUTINE_ASSIGNED': 'text-[#6D28D9] bg-[#F5F0FF]',
      'ROUTINE_REMINDER': 'text-[#7C3AED] bg-[#F3E8FF]',
      'ROUTINE_COMPLETED': 'text-emerald-700 bg-emerald-50',
      'ROUTINE_PENDING': 'text-amber-700 bg-amber-50',
      'EVERCARE_PREVENTION': 'text-[#6D28D9] bg-[#F5F0FF]',
      'PATIENT_INCIDENT_CREATED': 'text-rose-700 bg-rose-50',
      'DOCTOR_RECOMMENDATION': 'text-[#6D28D9] bg-[#F5F0FF]',
      'TRACKING_SAFE_ZONE_ALERT': 'text-rose-700 bg-rose-50',
      'PRESCRIPTION_DAILY_SCHEDULE': 'text-emerald-700 bg-emerald-50'
    };
    return colors[action] || 'text-gray-600 bg-gray-50';
  }

  hasActionButton(action: string): boolean {
    return action === 'PRE_CONSULTATION_FORM';
  }
}
