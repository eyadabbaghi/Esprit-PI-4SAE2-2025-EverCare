import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
  id: string;
  activityId: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  details: string;
  timestamp: string;   // ISO string
  read?: boolean;      // local only, not from backend
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Update with your actual notification service URL
 // private apiUrl = 'http://localhost:8095/EverCare/api/notifications';
 private apiUrl = 'http://localhost:8089/EverCare/api/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  // Optional – if backend supports marking as read
  // markAsRead(id: string): Observable<void> { ... }
}