// services/appointment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, timeout, retry, map } from 'rxjs/operators';
import { Appointment, AppointmentStatus, CaregiverPresence, RecurrencePattern } from '../models/appointment';
import { CreateAppointmentRequest } from '../models/appointment-request';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private baseUrl = "http://localhost:8089/EverCare/appointments";
  private readonly TIMEOUT = 30000; // 30 seconds timeout

  constructor(private http: HttpClient) { }

  // ========== READ OPERATIONS ==========

  getAllAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.baseUrl).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in getAllAppointments:', error);
        return throwError(() => error);
      })
    );
  }

  getAppointmentById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.baseUrl}/${id}`).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in getAppointmentById:', error);
        return throwError(() => error);
      })
    );
  }

  getAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    console.log('📡 Fetching appointments for patient:', patientId);

    const url = `${this.baseUrl}/patient/${patientId}`;

    // Add cache-busting parameter
    const urlWithCache = `${url}?_=${Date.now()}`;

    return this.http.get(urlWithCache, {
      responseType: 'text' // Get as text first to handle malformed JSON
    }).pipe(
      timeout(this.TIMEOUT),
      map(response => {
        console.log('📦 Raw response length:', response.length);

        // Try to parse the response as JSON
        try {
          if (!response || response.trim() === '') {
            console.warn('Empty response from server');
            return [];
          }

          const data = JSON.parse(response);

          // Ensure we return an array
          if (Array.isArray(data)) {
            // Validate and cast to Appointment type
            return data as Appointment[];
          } else if (data && typeof data === 'object') {
            // If it's a single object, wrap it in an array
            return [data] as Appointment[];
          } else {
            console.warn('Response is not an array or object');
            return [];
          }
        } catch (e) {
          console.error('❌ Failed to parse JSON response:', e);
          console.error('First 200 chars:', response.substring(0, 200));
          // Throw error instead of returning empty array
          throw new Error('Invalid JSON response from server');
        }
      }),
      catchError(error => {
        console.error('❌ Error in getAppointmentsByPatient:', error);

        // Special handling for incomplete chunked encoding
        if (error.status === 200) {
          console.error('⚠️ Server returned status 200 but response is incomplete');
          console.error('This is a BACKEND issue - the server is sending malformed JSON');
          return throwError(() => new Error('Server sent incomplete data'));
        }

        // Pass through the original error
        return throwError(() => error);
      })
    );
  }

  getAppointmentsByDoctor(doctorId: string): Observable<Appointment[]> {
    if (!doctorId) {
      return of([]);
    }

    return this.http.get<Appointment[]>(`${this.baseUrl}/doctor/${doctorId}`).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in getAppointmentsByDoctor:', error);
        return throwError(() => error);
      })
    );
  }

  getAppointmentsByCaregiver(caregiverId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/caregiver/${caregiverId}`).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in getAppointmentsByCaregiver:', error);
        return throwError(() => error);
      })
    );
  }

  getAppointmentsByStatus(status: AppointmentStatus): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/status/${status}`).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in getAppointmentsByStatus:', error);
        return throwError(() => error);
      })
    );
  }

  getAppointmentsByDateRange(start: Date, end: Date): Observable<Appointment[]> {
    const params = new HttpParams()
      .set('start', start.toISOString())
      .set('end', end.toISOString());

    return this.http.get<Appointment[]>(`${this.baseUrl}/date-range`, { params }).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in getAppointmentsByDateRange:', error);
        return throwError(() => error);
      })
    );
  }

  getAppointmentsByDoctorAndDateRange(doctorId: string, start: Date, end: Date): Observable<Appointment[]> {
    const params = new HttpParams()
      .set('start', start.toISOString())
      .set('end', end.toISOString());

    return this.http.get<Appointment[]>(`${this.baseUrl}/doctor/${doctorId}/date-range`, { params }).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in getAppointmentsByDoctorAndDateRange:', error);
        return throwError(() => error);
      })
    );
  }

  getFutureAppointmentsByPatient(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/patient/${patientId}/future`).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in getFutureAppointmentsByPatient:', error);
        return throwError(() => error);
      })
    );
  }

  checkDoctorAvailability(doctorId: string, dateTime: Date): Observable<boolean> {
    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('dateTime', dateTime.toISOString());

    return this.http.get<boolean>(`${this.baseUrl}/check-availability`, { params }).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in checkDoctorAvailability:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== CREATE OPERATIONS ==========

  createAppointment(appointmentData: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.baseUrl, appointmentData).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in createAppointment:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== UPDATE OPERATIONS ==========

  updateAppointment(id: string, appointment: Partial<Appointment>): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.baseUrl}/${id}`, appointment).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in updateAppointment:', error);
        return throwError(() => error);
      })
    );
  }

  confirmByPatient(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/confirm-patient`, {}).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in confirmByPatient:', error);
        return throwError(() => error);
      })
    );
  }

  confirmByCaregiver(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/confirm-caregiver`, {}).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in confirmByCaregiver:', error);
        return throwError(() => error);
      })
    );
  }

  cancelAppointment(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/cancel`, {}).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in cancelAppointment:', error);
        return throwError(() => error);
      })
    );
  }

  rescheduleAppointment(id: string, newDateTime: Date): Observable<Appointment> {
    const params = new HttpParams()
      .set('newDateTime', newDateTime.toISOString());

    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/reschedule`, null, { params }).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in rescheduleAppointment:', error);
        return throwError(() => error);
      })
    );
  }

  updateDoctorNotes(id: string, notes: string): Observable<Appointment> {
    const params = new HttpParams().set('notes', notes);
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/notes`, null, { params }).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in updateDoctorNotes:', error);
        return throwError(() => error);
      })
    );
  }

  updateSimpleSummary(id: string, summary: string): Observable<Appointment> {
    const params = new HttpParams().set('summary', summary);
    return this.http.patch<Appointment>(`${this.baseUrl}/${id}/summary`, null, { params }).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in updateSimpleSummary:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== DELETE OPERATIONS ==========

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in deleteAppointment:', error);
        return throwError(() => error);
      })
    );
  }

  deleteAppointmentsByPatient(patientId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/patient/${patientId}`).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in deleteAppointmentsByPatient:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== UTILITY OPERATIONS ==========

  countAppointmentsByDoctorAndDate(doctorId: string, date: Date): Observable<number> {
    const params = new HttpParams()
      .set('doctorId', doctorId)
      .set('date', date.toISOString());

    return this.http.get<number>(`${this.baseUrl}/count`, { params }).pipe(
      timeout(this.TIMEOUT),
      retry(1),
      catchError(error => {
        console.error('Error in countAppointmentsByDoctorAndDate:', error);
        return throwError(() => error);
      })
    );
  }

  sendReminders(): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/send-reminders`, {}).pipe(
      timeout(this.TIMEOUT),
      catchError(error => {
        console.error('Error in sendReminders:', error);
        return throwError(() => error);
      })
    );
  }
}
