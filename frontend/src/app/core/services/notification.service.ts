import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  id: string;
  activityId: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'PRE_CONSULTATION_FORM';
  details: string;
  timestamp: string;
  read?: boolean;
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

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'CREATED': 'Created',
      'UPDATED': 'Updated',
      'DELETED': 'Deleted',
      'PRE_CONSULTATION_FORM': 'Submit Clinical Data'
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
      'PRE_CONSULTATION_FORM': 'text-[#7C3AED] bg-[#F3E8FF]'
    };
    return colors[action] || 'text-gray-600 bg-gray-50';
  }

  hasActionButton(action: string): boolean {
    return action === 'PRE_CONSULTATION_FORM';
  }
}