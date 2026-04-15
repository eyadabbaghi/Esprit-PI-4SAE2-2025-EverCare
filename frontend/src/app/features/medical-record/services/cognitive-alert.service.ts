import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CognitiveAlert } from '../models/cognitive-alert.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CognitiveAlertService {
  private readonly apiUrl = environment.cognitiveStimulationApiUrl;

  constructor(private http: HttpClient) {}

  listAll(): Observable<CognitiveAlert[]> {
    return this.http.get<CognitiveAlert[]>(`${this.apiUrl}/cognitive-alerts`);
  }

  listByMedicalRecord(recordId: string): Observable<CognitiveAlert[]> {
    return this.http.get<CognitiveAlert[]>(`${this.apiUrl}/cognitive-alerts/medical-record/${recordId}`);
  }

  acknowledge(alertId: string): Observable<CognitiveAlert> {
    return this.http.patch<CognitiveAlert>(`${this.apiUrl}/cognitive-alerts/${alertId}/acknowledge`, {});
  }

  resolve(alertId: string): Observable<CognitiveAlert> {
    return this.http.patch<CognitiveAlert>(`${this.apiUrl}/cognitive-alerts/${alertId}/resolve`, {});
  }
}

