import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssessmentCreateRequest,
  AssessmentDoctorNoteRequest,
  ClinicalAlert,
  ClinicalAlertPage,
  ClinicalAlertStatus,
  AssessmentPage,
  AssessmentReport,
  AssessmentStageFilter,
} from '../models/assessment.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AssessmentService {
  private readonly baseApiUrl = this.resolveBaseApiUrl();
  private readonly assessmentsUrl = `${this.baseApiUrl}/assessments`;
  private readonly alertsUrl = `${this.baseApiUrl}/alerts`;

  constructor(private readonly http: HttpClient) {}

  create(payload: AssessmentCreateRequest): Observable<AssessmentReport> {
    return this.http.post<AssessmentReport>(this.assessmentsUrl, payload);
  }

  getById(id: string): Observable<AssessmentReport> {
    return this.http.get<AssessmentReport>(`${this.assessmentsUrl}/${id}`);
  }

  getByPatient(patientId: string): Observable<AssessmentReport[]> {
    return this.http.get<AssessmentReport[]>(`${this.assessmentsUrl}/patient/${patientId}`);
  }

  getPage(
    page: number,
    size: number,
    stage: AssessmentStageFilter,
    fromDate: string,
    toDate: string,
    query: string,
    active?: boolean
  ): Observable<AssessmentPage> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));

    if (active !== undefined) {
      params = params.set('active', String(active));
    }
    if (stage) {
      params = params.set('stage', stage);
    }
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    if (query.trim()) {
      params = params.set('query', query.trim());
    }

    return this.http.get<AssessmentPage>(this.assessmentsUrl, { params });
  }

  getAlerts(page: number, size: number): Observable<AssessmentPage> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<AssessmentPage>(`${this.assessmentsUrl}/alerts`, { params });
  }

  getClinicalAlerts(page: number, size: number, status?: ClinicalAlertStatus): Observable<ClinicalAlertPage> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ClinicalAlertPage>(this.alertsUrl, { params });
  }

  acknowledgeAlert(alertId: string): Observable<ClinicalAlert> {
    return this.http.patch<ClinicalAlert>(`${this.alertsUrl}/${alertId}/ack`, {});
  }

  resolveAlert(alertId: string): Observable<ClinicalAlert> {
    return this.http.patch<ClinicalAlert>(`${this.alertsUrl}/${alertId}/resolve`, {});
  }

  getOrCreateAlertFromReport(assessmentReportId: string): Observable<ClinicalAlert> {
    return this.http.post<ClinicalAlert>(`${this.alertsUrl}/from-report/${assessmentReportId}`, {});
  }

  patchDoctorNote(id: string, payload: AssessmentDoctorNoteRequest): Observable<AssessmentReport> {
    return this.http.patch<AssessmentReport>(`${this.assessmentsUrl}/${id}/doctor-note`, payload);
  }

  archive(id: string): Observable<void> {
    return this.http.delete<void>(`${this.assessmentsUrl}/${id}`);
  }

  restore(id: string): Observable<AssessmentReport> {
    return this.http.patch<AssessmentReport>(`${this.assessmentsUrl}/${id}/restore`, {});
  }

  downloadPdf(id: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.assessmentsUrl}/${id}/pdf`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  private resolveBaseApiUrl(): string {
    const configured = environment.medicalRecordApiUrl;
    if (configured.endsWith('/medical-records')) {
      return configured.slice(0, configured.length - '/medical-records'.length);
    }
    return configured;
  }
}
