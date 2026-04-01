import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Prescription, PrescriptionRequest } from '../models/prescription.model';

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {

  private readonly API_URL = 'http://localhost:8089/EverCare/prescriptions';

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
}
