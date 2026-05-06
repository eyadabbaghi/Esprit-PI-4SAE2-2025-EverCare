// services/availability.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { of } from 'rxjs';

import { Availability } from '../models/availability.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AvailabilityService {

  private baseUrl = environment.apiUrl + "/availabilities";

  constructor(private http: HttpClient) { }

  // ========== READ OPERATIONS ==========

  getAllAvailabilities(): Observable<Availability[]> {
    return this.http.get<Availability[]>(this.baseUrl);
  }

  getAvailabilityById(id: string): Observable<Availability> {
    return this.http.get<Availability>(`${this.baseUrl}/${id}`);
  }

  getAvailabilitiesByDoctor(doctorId: string): Observable<Availability[]> {
    if (!doctorId) {
      return of([]);
    }

    return this.http.get<Availability[]>(`${this.baseUrl}/doctor/${doctorId}`);
  }

  getAvailabilitiesByDoctorAndDay(doctorId: string, dayOfWeek: string): Observable<Availability[]> {
    return this.http.get<Availability[]>(`${this.baseUrl}/doctor/${doctorId}/day/${dayOfWeek}`);
  }

  getValidAvailabilitiesForDate(doctorId: string, date: Date): Observable<Availability[]> {
    const params = new HttpParams()
      .set('date', date.toISOString().split('T')[0]);

    return this.http.get<Availability[]>(`${this.baseUrl}/doctor/${doctorId}/valid`, { params });
  }

  getBlockedSlots(doctorId: string): Observable<Availability[]> {
    return this.http.get<Availability[]>(`${this.baseUrl}/doctor/${doctorId}/blocked`);
  }

  getAvailabilitiesByRecurrence(recurrence: string): Observable<Availability[]> {
    return this.http.get<Availability[]>(`${this.baseUrl}/recurrence/${recurrence}`);
  }

  getAvailabilitiesByDoctorAndPeriod(doctorId: string, from: Date, to: Date): Observable<Availability[]> {
    const params = new HttpParams()
      .set('from', from.toISOString().split('T')[0])
      .set('to', to.toISOString().split('T')[0]);

    return this.http.get<Availability[]>(`${this.baseUrl}/doctor/${doctorId}/period`, { params });
  }

  getAvailableTimeSlots(doctorId: string, date: Date, durationMinutes: number): Observable<string[]> {
    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('date', date.toISOString().split('T')[0])
      .set('durationMinutes', durationMinutes.toString());

    return this.http.get<string[]>(`${this.baseUrl}/available-slots`, { params });
  }

  checkSlotAvailability(doctorId: string, date: Date, time: string): Observable<boolean> {
    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('date', date.toISOString().split('T')[0])
      .set('time', time);

    return this.http.get<boolean>(`${this.baseUrl}/check`, { params });
  }

  // ========== CREATE OPERATIONS ==========

  // In availability.service.ts - update createAvailability method
  createAvailability(availability: any): Observable<Availability> {
    // Make sure the payload structure matches what backend expects
    const payload = {
      doctor: { userId: availability.doctor.userId }, // Backend expects a User object
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      slotDuration: availability.slotDuration,
      validFrom: availability.validFrom,
      validTo: availability.validTo,
      recurrence: availability.recurrence,
      isBlocked: availability.isBlocked || false,
      blockReason: availability.blockReason || null
    };

    return this.http.post<Availability>(this.baseUrl, payload);
  }

  createMultipleAvailabilities(availabilities: Partial<Availability>[]): Observable<Availability[]> {
    return this.http.post<Availability[]>(`${this.baseUrl}/batch`, availabilities);
  }

  createWeeklyAvailability(
    doctorId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string,
    validFrom?: Date,
    validTo?: Date
  ): Observable<Availability> {
    let params = new HttpParams()
      .set('doctorId', doctorId)
      .set('dayOfWeek', dayOfWeek)
      .set('startTime', startTime)
      .set('endTime', endTime);

    if (validFrom) {
      params = params.set('validFrom', validFrom.toISOString().split('T')[0]);
    }
    if (validTo) {
      params = params.set('validTo', validTo.toISOString().split('T')[0]);
    }

    return this.http.post<Availability>(`${this.baseUrl}/weekly`, null, { params });
  }

  // ========== UPDATE OPERATIONS ==========

  updateAvailability(id: string, availability: Partial<Availability>): Observable<Availability> {
    return this.http.put<Availability>(`${this.baseUrl}/${id}`, availability);
  }

  blockSlot(id: string, reason: string): Observable<Availability> {
    const params = new HttpParams().set('reason', reason);
    return this.http.patch<Availability>(`${this.baseUrl}/${id}/block`, null, { params });
  }

  unblockSlot(id: string): Observable<Availability> {
    return this.http.patch<Availability>(`${this.baseUrl}/${id}/unblock`, {});
  }

  extendValidity(id: string, newValidTo: Date): Observable<Availability> {
    const params = new HttpParams()
      .set('newValidTo', newValidTo.toISOString().split('T')[0]);

    return this.http.patch<Availability>(`${this.baseUrl}/${id}/extend`, null, { params });
  }

  // ========== DELETE OPERATIONS ==========

  deleteAvailability(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  deleteAvailabilitiesByDoctor(doctorId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/doctor/${doctorId}`);
  }

  deleteExpiredAvailabilities(date: Date): Observable<void> {
    const params = new HttpParams()
      .set('date', date.toISOString().split('T')[0]);

    return this.http.delete<void>(`${this.baseUrl}/expired`, { params });
  }
}
