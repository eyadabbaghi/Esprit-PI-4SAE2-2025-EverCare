// services/consultation-type.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConsultationType } from '../models/consultation-type.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConsultationTypeService {

  private baseUrl = environment.apiUrl + "/consultation-types";

  constructor(private http: HttpClient) { }

  // ========== READ OPERATIONS ==========

  getAllConsultationTypes(): Observable<ConsultationType[]> {
    return this.http.get<ConsultationType[]>(this.baseUrl);
  }

  getConsultationTypeById(id: string): Observable<ConsultationType> {
    return this.http.get<ConsultationType>(`${this.baseUrl}/${id}`);
  }

  getConsultationTypeByName(name: string): Observable<ConsultationType> {
    return this.http.get<ConsultationType>(`${this.baseUrl}/name/${name}`);
  }

  getActiveConsultationTypes(): Observable<ConsultationType[]> {
    return this.http.get<ConsultationType[]>(`${this.baseUrl}/active`);
  }

  getTypesRequiringCaregiver(): Observable<ConsultationType[]> {
    return this.http.get<ConsultationType[]>(`${this.baseUrl}/requires-caregiver`);
  }

  searchTypes(keyword: string): Observable<ConsultationType[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<ConsultationType[]>(`${this.baseUrl}/search`, { params });
  }

  getTypesByMaxDuration(minutes: number): Observable<ConsultationType[]> {
    return this.http.get<ConsultationType[]>(`${this.baseUrl}/max-duration/${minutes}`);
  }

  // ========== CREATE OPERATIONS ==========

  createConsultationType(type: Partial<ConsultationType>): Observable<ConsultationType> {
    return this.http.post<ConsultationType>(this.baseUrl, type);
  }

  createSimpleConsultationType(
    name: string,
    description: string,
    defaultDurationMinutes: number,
    requiresCaregiver: boolean,
    environmentPreset: string
  ): Observable<ConsultationType> {
    const params = new HttpParams()
      .set('name', name)
      .set('description', description)
      .set('defaultDurationMinutes', defaultDurationMinutes.toString())
      .set('requiresCaregiver', requiresCaregiver.toString())
      .set('environmentPreset', environmentPreset);

    return this.http.post<ConsultationType>(`${this.baseUrl}/simple`, null, { params });
  }

  // ========== UPDATE OPERATIONS ==========

  updateConsultationType(id: string, type: Partial<ConsultationType>): Observable<ConsultationType> {
    return this.http.put<ConsultationType>(`${this.baseUrl}/${id}`, type);
  }

  activateType(id: string): Observable<ConsultationType> {
    return this.http.patch<ConsultationType>(`${this.baseUrl}/${id}/activate`, {});
  }

  deactivateType(id: string): Observable<ConsultationType> {
    return this.http.patch<ConsultationType>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  updateDuration(id: string, defaultDurationMinutes: number): Observable<ConsultationType> {
    const params = new HttpParams()
      .set('defaultDurationMinutes', defaultDurationMinutes.toString());

    return this.http.patch<ConsultationType>(`${this.baseUrl}/${id}/duration`, null, { params });
  }

  updateEnvironmentPreset(id: string, environmentPreset: string): Observable<ConsultationType> {
    const params = new HttpParams().set('environmentPreset', environmentPreset);
    return this.http.patch<ConsultationType>(`${this.baseUrl}/${id}/environment`, null, { params });
  }

  // ========== DELETE OPERATIONS ==========

  deleteConsultationType(id: string): Observable<void> {
    console.log(`Deleting consultation type with ID: ${id}`);
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  deleteAllConsultationTypes(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/all`);
  }

  // ========== BUSINESS LOGIC OPERATIONS ==========

  calculateAlzheimerDuration(defaultDuration: number): Observable<number> {
    const params = new HttpParams()
      .set('defaultDuration', defaultDuration.toString());

    return this.http.get<number>(`${this.baseUrl}/calculate-alzheimer-duration`, { params });
  }

  isTypeAvailableForPatient(id: string, patientStage: string): Observable<boolean> {
    const params = new HttpParams().set('patientStage', patientStage);
    return this.http.get<boolean>(`${this.baseUrl}/${id}/available-for-patient`, { params });
  }

  getRecommendedTypesForPatient(patientStage: string): Observable<ConsultationType[]> {
    const params = new HttpParams().set('patientStage', patientStage);
    return this.http.get<ConsultationType[]>(`${this.baseUrl}/recommended-for-patient`, { params });
  }

  countConsultationsByType(id: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/${id}/consultations-count`);
  }
}
