// services/appointment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment } from '../models/appointment';
import { CreateAppointmentRequest } from '../models/appointment-request';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private baseUrl = "http://localhost:8085/EverCare/appointments";

  constructor(private http: HttpClient) { }

  // ========== READ OPERATIONS ==========

  getAllAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.baseUrl);
  }

  getAppointmentById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.baseUrl}/${id}`);
  }

  getAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/patient/${patientId}`);
  }

  getAppointmentsByDoctor(doctorId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/doctor/${doctorId}`);
  }

  getAppointmentsByCaregiver(caregiverId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/caregiver/${caregiverId}`);
  }

  getAppointmentsByStatus(status: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/status/${status}`);
  }

  getAppointmentsByDateRange(start: Date, end: Date): Observable<Appointment[]> {
    const params = new HttpParams()
      .set('start', start.toISOString())
      .set('end', end.toISOString());

    return this.http.get<Appointment[]>(`${this.baseUrl}/date-range`, { params });
  }

  getAppointmentsByDoctorAndDateRange(doctorId: string, start: Date, end: Date): Observable<Appointment[]> {
    const params = new HttpParams()
      .set('start', start.toISOString())
      .set('end', end.toISOString());

    return this.http.get<Appointment[]>(`${this.baseUrl}/doctor/${doctorId}/date-range`, { params });
  }

  getFutureAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/patient/${patientId}/future`);
  }

  checkDoctorAvailability(doctorId: string, dateTime: Date): Observable<boolean> {
    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('dateTime', dateTime.toISOString());

    return this.http.get<boolean>(`${this.baseUrl}/check-availability`, { params });
  }

  // ========== CREATE OPERATIONS ==========

  createAppointment(appointmentData: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.baseUrl, appointmentData);
  }

  // ========== UPDATE OPERATIONS ==========

  updateAppointment(id: string, appointment: Partial<Appointment>): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.baseUrl}/${id}`, appointment);
  }

  confirmByPatient(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/confirm-patient`, {});
  }

  confirmByCaregiver(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/confirm-caregiver`, {});
  }

  cancelAppointment(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/cancel`, {});
  }

  rescheduleAppointment(id: string, newDateTime: Date): Observable<Appointment> {
    const params = new HttpParams()
      .set('newDateTime', newDateTime.toISOString());

    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/reschedule`, null, { params });
  }

  updateDoctorNotes(id: string, notes: string): Observable<Appointment> {
    const params = new HttpParams().set('notes', notes);
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/notes`, null, { params });
  }

  updateSimpleSummary(id: string, summary: string): Observable<Appointment> {
    const params = new HttpParams().set('summary', summary);
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/summary`, null, { params });
  }

  // ========== DELETE OPERATIONS ==========

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  deleteAppointmentsByPatient(patientId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/patient/${patientId}`);
  }

  // ========== UTILITY OPERATIONS ==========

  countAppointmentsByDoctorAndDate(doctorId: string, date: Date): Observable<number> {
    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('date', date.toISOString());

    return this.http.get<number>(`${this.baseUrl}/count`, { params });
  }

  sendReminders(): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/send-reminders`, {});
  }
}
