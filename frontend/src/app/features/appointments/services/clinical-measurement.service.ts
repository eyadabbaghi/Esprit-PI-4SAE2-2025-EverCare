import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClinicalMeasurementRequest, ClinicalMeasurementResponse } from '../models/clinical-measurement.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClinicalMeasurementService {
  private readonly API_URL = `${environment.apiUrl}/api/clinical-measurements`;

  constructor(private http: HttpClient) {}

  submitMeasurement(data: ClinicalMeasurementRequest, caregiverId: string): Observable<ClinicalMeasurementResponse> {
    const headers = new HttpHeaders({
      'X-User-Id': caregiverId
    });
    return this.http.post<ClinicalMeasurementResponse>(this.API_URL, data, { headers });
  }

  getByAppointment(appointmentId: string): Observable<ClinicalMeasurementResponse> {
    return this.http.get<ClinicalMeasurementResponse>(`${this.API_URL}/appointment/${appointmentId}`);
  }

  getByPatient(patientId: string): Observable<ClinicalMeasurementResponse[]> {
    return this.http.get<ClinicalMeasurementResponse[]>(`${this.API_URL}/patient/${patientId}`);
  }

  getLatestForPatient(patientId: string): Observable<ClinicalMeasurementResponse> {
    return this.http.get<ClinicalMeasurementResponse>(`${this.API_URL}/patient/${patientId}/latest`);
  }

  checkIfSubmittedForAppointment(appointmentId: string): Observable<ClinicalMeasurementResponse | null> {
    return this.http.get<ClinicalMeasurementResponse>(`${this.API_URL}/appointment/${appointmentId}`);
  }
}