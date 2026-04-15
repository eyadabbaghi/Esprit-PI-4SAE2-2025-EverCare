import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateMedicalHistoryRequest, MedicalHistory } from '../models/medical-history.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MedicalHistoryService {
  private readonly baseUrl = environment.medicalRecordApiUrl;

  constructor(private readonly http: HttpClient) {}

  listByRecord(recordId: string): Observable<MedicalHistory[]> {
    return this.http.get<MedicalHistory[]>(`${this.baseUrl}/${recordId}/history`);
  }

  addToRecord(recordId: string, payload: CreateMedicalHistoryRequest): Observable<MedicalHistory> {
    return this.http.post<MedicalHistory>(`${this.baseUrl}/${recordId}/history`, payload);
  }

  delete(recordId: string, historyId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${recordId}/history/${historyId}`);
  }
}
