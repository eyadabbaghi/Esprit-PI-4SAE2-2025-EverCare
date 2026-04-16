import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Prescription, PrescriptionFilterParams, PrescriptionRequest } from '../models/prescription.model';
import { PageResponse } from '../models/page.model';
import { PrescriptionAnalyticsSummary, StatusCount, TopMedicament } from '../models/prescription-analytics.model';
import { environment } from '../../../../environments/environment';

// Import clinical measurement types
export interface ClinicalMeasurementResponse {
  measurementId: string;
  patientId: string;
  appointmentId?: string;
  weight: number;
  kidneyTestResult: string;
  severeLiverProblem: boolean;
  currentMedications?: string;
  allergies?: string;
  measuredAt: string;
  measuredBy: string;
}

export interface SafetyCheckResult {
  isSafe: boolean;
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'MILD' | 'MODERATE' | 'SEVERE';
  message: string;
  suggestedDose?: string;
  interactions?: string[];
  contraindications?: string[];
  warnings?: string[];
}

export interface SafetyCheckResponse {
  isValid: boolean;
  level: 'SAFE' | 'WARNING' | 'CRITICAL';
  message: string;
  warnings?: string[];
  requiresJustification: boolean;
  suggestedDose?: string;
  interactions?: string[];
  contraindications?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  private readonly API_URL = `${environment.apiUrl}/prescriptions`;
  private readonly CLINICAL_MEASUREMENT_URL = `${environment.apiUrl}/api/clinical-measurements`;

  constructor(private http: HttpClient) {}

  // ========== CLINICAL MEASUREMENTS ==========

  getClinicalMeasurementByAppointment(appointmentId: string): Observable<ClinicalMeasurementResponse> {
    return this.http.get<ClinicalMeasurementResponse>(`${this.CLINICAL_MEASUREMENT_URL}/appointment/${appointmentId}`);
  }

  getLatestClinicalMeasurement(patientId: string): Observable<ClinicalMeasurementResponse> {
    return this.http.get<ClinicalMeasurementResponse>(`${this.CLINICAL_MEASUREMENT_URL}/patient/${patientId}/latest`);
  }

  // ========== CREATE ==========

  createPrescription(request: PrescriptionRequest): Observable<Prescription> {
    return this.http.post<Prescription>(this.API_URL, request);
  }

  // ========== CHECK SAFETY ==========

  checkPrescriptionSafety(request: PrescriptionRequest): Observable<SafetyCheckResponse> {
    return this.http.post<SafetyCheckResponse>(`${this.API_URL}/check-safety`, request);
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

  getPrescriptionsByPatientWithContext(patientId: string, contextUserId: string, contextRole: string): Observable<Prescription[]> {
    const headers = new HttpHeaders({
      'X-User-Id': contextUserId,
      'X-User-Role': contextRole
    });

    return this.http.get<Prescription[]>(`${this.API_URL}/patient/${patientId}`, { headers });
  }

  getActivePrescriptionsByPatient(patientId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_URL}/patient/${patientId}/active`);
  }

  getTodayPrescriptions(patientId: string): Observable<Prescription[]> {
    return this.http.get<Prescription[]>(`${this.API_URL}/patient/${patientId}/today`);
  }

  getTodayPrescriptionsWithContext(patientId: string, contextUserId: string, contextRole: string): Observable<Prescription[]> {
    const headers = new HttpHeaders({
      'X-User-Id': contextUserId,
      'X-User-Role': contextRole
    });

    return this.http.get<Prescription[]>(`${this.API_URL}/patient/${patientId}/today`, { headers });
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

  filterPrescriptions(filters: PrescriptionFilterParams): Observable<PageResponse<Prescription>> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<PageResponse<Prescription>>(`${this.API_URL}/filter`, { params });
  }

  getAnalyticsSummary(): Observable<PrescriptionAnalyticsSummary> {
    return this.http.get<PrescriptionAnalyticsSummary>(`${this.API_URL}/analytics/summary`);
  }

  getStatusBreakdown(): Observable<StatusCount[]> {
    return this.http.get<StatusCount[]>(`${this.API_URL}/analytics/status-breakdown`);
  }

  getTopMedicaments(limit: number = 5): Observable<TopMedicament[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<TopMedicament[]>(`${this.API_URL}/analytics/top-medicaments`, { params });
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

  renewPrescription(id: string, options: { newDateFin?: string; additionalDays?: number }): Observable<Prescription> {
    let params = new HttpParams();

    if (options.newDateFin) {
      params = params.set('newDateFin', options.newDateFin);
    }

    if (options.additionalDays !== undefined) {
      params = params.set('additionalDays', options.additionalDays.toString());
    }

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

  updateInstructions(id: string, instructions: string): Observable<Prescription> {
    const params = new HttpParams().set('instructions', instructions);
    return this.http.patch<Prescription>(`${this.API_URL}/${id}/instructions`, {}, { params });
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
