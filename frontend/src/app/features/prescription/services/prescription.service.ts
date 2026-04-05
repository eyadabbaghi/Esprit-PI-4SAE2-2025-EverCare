import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Prescription, PrescriptionRequest } from '../models/prescription.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  private readonly API_URL = `${environment.apiUrl}/prescriptions`;

  constructor(private http: HttpClient) {}

  // ========== CREATE ==========

  createPrescription(request: PrescriptionRequest): Observable<Prescription> {
    return this.http.post<Prescription>(this.API_URL, request);
  }

  // ========== READ ==========

  getAllPrescriptions(): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(this.API_URL);
  }

  getPrescriptionById(id: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.API_URL}/${id}`);
  }

  getPrescriptionsByPatient(patientId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_URL}/patient/${patientId}`);
  }

  getActivePrescriptionsByPatient(patientId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_URL}/patient/${patientId}/active`);
  }

  getTodayPrescriptions(patientId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_URL}/patient/${patientId}/today`);
  }

  getPrescriptionsByDoctor(doctorId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_URL}/doctor/${doctorId}`);
  }

  getPrescriptionsByAppointment(appointmentId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_URL}/appointment/${appointmentId}`);
  }

  getPrescriptionsByStatus(statut: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_URL}/status/${statut}`);
  }

  getExpiringPrescriptions(days: number = 7): Observable<Prescription[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<Prescription[]>(`${this.API_URL}/expiring`, { params });
  }

  // ========== UPDATE ==========

  updatePrescription(id: string, request: PrescriptionRequest): Observable<Prescription> {
    return this.http.put<Prescription>(`${this.API_URL}/${id}`, request);
  }

  // ========== LIFECYCLE ==========

  terminatePrescription(id: string): Observable<Prescription> {
    return this.http.patch<Prescription>(`${this.API_URL}/${id}/terminate`, {});
  }

  cancelPrescription(id: string): Observable<Prescription> {
    return this.http.patch<Prescription>(`${this.API_URL}/${id}/cancel`, {});
  }

  renewPrescription(id: string, newDateFin: string): Observable<Prescription> {
    const params = new HttpParams().set('newDateFin', newDateFin);
    return this.http.patch<Prescription>(`${this.API_URL}/${id}/renew`, {}, { params });
  }

  // ========== PARTIAL UPDATES ==========

  updatePosologie(id: string, posologie: string): Observable<Prescription> {
    const params = new HttpParams().set('posologie', posologie);
    return this.http.patch<Prescription>(`${this.API_URL}/${id}/posologie`, {}, { params });
  }

  updateResumeSimple(id: string, resume: string): Observable<Prescription> {
    const params = new HttpParams().set('resume', resume);
    return this.http.patch<Prescription>(`${this.API_URL}/${id}/resume`, {}, { params });
  }

  addNotes(id: string, notes: string): Observable<Prescription> {
    const params = new HttpParams().set('notes', notes);
    return this.http.patch<Prescription>(`${this.API_URL}/${id}/notes`, {}, { params });
  }

  generatePdf(id: string): Observable<Prescription> {
    return this.http.post<Prescription>(`${this.API_URL}/${id}/generate-pdf`, {});
  }

  // ========== DELETE ==========

  deletePrescription(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  // ========== COUNT ==========

  countByMedicament(medicamentId: string): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/count/medicament/${medicamentId}`);
  }

  // ========== PDF ACTIONS ==========

  downloadPdf(prescriptionId: string): void {
    this.http.get(`${this.API_URL}/${prescriptionId}/pdf`, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescription-${prescriptionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('PDF download error:', error);
        
        // Handle different error types
        if (error.status === 500) {
          throw new Error('PDF generation is currently unavailable. Please try again later or contact support.');
        } else if (error.status === 404) {
          throw new Error('Prescription not found or PDF not available.');
        } else if (error.status === 403) {
          throw new Error('You do not have permission to download this prescription.');
        } else {
          throw new Error('Failed to download PDF. Please try again.');
        }
      }
    });
  }

  sendPdfByEmail(prescriptionId: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${prescriptionId}/send-pdf`, {}).pipe(
      catchError((error) => {
        console.error('Email send error:', error);
        
        let errorMessage = 'Failed to send email. Please try again.';
        
        if (error.status === 500) {
          errorMessage = 'Email service is currently unavailable. Please try again later.';
        } else if (error.status === 404) {
          errorMessage = 'Prescription not found or patient email not available.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to send this prescription.';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}
