import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Medicament, MedicamentAnalyticsSummary, MedicamentFilterParams, MedicamentRequest, MedicamentUsageStats } from '../models/medicament.model';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../models/page.model';

@Injectable({
  providedIn: 'root'
})
export class MedicamentService {

  private readonly API_URL = `${environment.apiUrl}/medicaments`;

  constructor(private http: HttpClient) {}

  // ========== CREATE ==========

  createMedicament(request: MedicamentRequest): Observable<Medicament> {
    return this.http.post<Medicament>(this.API_URL, request);
  }

  // ========== READ ==========

  getAllMedicaments(): Observable<Medicament[]> {
    return this.http.get<Medicament[]>(this.API_URL);
  }

  getMedicamentById(id: string): Observable<Medicament> {
    return this.http.get<Medicament>(`${this.API_URL}/${id}`);
  }

  getMedicamentByCodeCIP(codeCIP: string): Observable<Medicament> {
    return this.http.get<Medicament>(`${this.API_URL}/code/${codeCIP}`);
  }

  searchMedicaments(keyword: string): Observable<Medicament[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Medicament[]>(`${this.API_URL}/search`, { params });
  }

  getActiveMedicaments(): Observable<Medicament[]> {
    return this.http.get<Medicament[]>(`${this.API_URL}/active`);
  }

  filterMedicaments(filters: MedicamentFilterParams): Observable<PageResponse<Medicament>> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<PageResponse<Medicament>>(`${this.API_URL}/filter`, { params });
  }

  getUsageStats(limit: number = 50): Observable<MedicamentUsageStats[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<MedicamentUsageStats[]>(`${this.API_URL}/analytics/usage`, { params });
  }

  getAnalyticsSummary(): Observable<MedicamentAnalyticsSummary> {
    return this.http.get<MedicamentAnalyticsSummary>(`${this.API_URL}/analytics/summary`);
  }

  getMedicamentsByLaboratoire(laboratoire: string): Observable<Medicament[]> {
    return this.http.get<Medicament[]>(`${this.API_URL}/laboratoire/${laboratoire}`);
  }

  getMedicamentsByForme(forme: string): Observable<Medicament[]> {
    return this.http.get<Medicament[]>(`${this.API_URL}/forme/${forme}`);
  }

  // ========== UPDATE ==========

  updateMedicament(id: string, request: MedicamentRequest): Observable<Medicament> {
    return this.http.put<Medicament>(`${this.API_URL}/${id}`, request);
  }

  activateMedicament(id: string): Observable<Medicament> {
    return this.http.patch<Medicament>(`${this.API_URL}/${id}/activate`, {});
  }

  deactivateMedicament(id: string): Observable<Medicament> {
    return this.http.patch<Medicament>(`${this.API_URL}/${id}/deactivate`, {});
  }

  updatePhoto(id: string, photoUrl: string): Observable<Medicament> {
    const params = new HttpParams().set('photoUrl', photoUrl);
    return this.http.patch<Medicament>(`${this.API_URL}/${id}/photo`, {}, { params });
  }

  updateNotice(id: string, notice: string): Observable<Medicament> {
    const params = new HttpParams().set('notice', notice);
    return this.http.patch<Medicament>(`${this.API_URL}/${id}/notice`, {}, { params });
  }

  // ========== DELETE ==========

  deleteMedicament(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  // ========== COUNT ==========

  countMedicaments(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/count`);
  }
}
