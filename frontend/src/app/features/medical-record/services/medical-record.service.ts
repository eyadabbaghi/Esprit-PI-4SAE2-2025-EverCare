import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateMedicalRecordRequest,
  MedicalRecordPage,
  MedicalRecord,
  UpdateMedicalRecordRequest,
} from '../models/medical-record.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  private readonly apiUrl = environment.medicalRecordApiUrl;

  constructor(private readonly http: HttpClient) {}

  getPage(page: number, size: number, active?: boolean): Observable<MedicalRecordPage> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (active !== undefined) {
      params = params.set('active', String(active));
    }

    return this.http.get<MedicalRecordPage>(this.apiUrl, { params });
  }

  getById(id: string): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(`${this.apiUrl}/${id}`);
  }

  getByPatientId(patientId: string): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(`${this.apiUrl}/patient/${patientId}`);
  }

  create(payload: CreateMedicalRecordRequest): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(this.apiUrl, payload);
  }

  autoCreate(payload: CreateMedicalRecordRequest): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(`${this.apiUrl}/auto-create`, payload);
  }

  // Patient-facing pages can recover from a missing record by asking the backend
  // to create the minimal default entry on first access.
  ensureForPatientId(patientId: string): Observable<MedicalRecord> {
    return this.autoCreate({ patientId });
  }

  update(id: string, payload: UpdateMedicalRecordRequest): Observable<MedicalRecord> {
    return this.http.put<MedicalRecord>(`${this.apiUrl}/${id}`, payload);
  }

  archive(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  restore(id: string): Observable<MedicalRecord> {
    return this.http.patch<MedicalRecord>(`${this.apiUrl}/${id}/restore`, {});
  }

}
