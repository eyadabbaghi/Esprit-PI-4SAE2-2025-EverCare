import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Medicament, MedicamentAnalyticsSummary, MedicamentFilterParams, MedicamentRequest, MedicamentUsageStats } from '../models/medicament.model';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../models/page.model';
import { AuthService } from '../../front-office/pages/login/auth.service';

@Injectable({
  providedIn: 'root'
})
export class MedicamentService {

  private readonly API_URL = `${environment.apiUrl}/medicaments`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ========== CREATE ==========

  createMedicament(request: MedicamentRequest): Observable<Medicament> {
    return this.http.post<Medicament>(this.API_URL, request, {
      headers: this.getAdminActorHeaders()
    });
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
    return this.http.put<Medicament>(`${this.API_URL}/${id}`, request, {
      headers: this.getAdminActorHeaders()
    });
  }

  activateMedicament(id: string): Observable<Medicament> {
    return this.http.patch<Medicament>(`${this.API_URL}/${id}/activate`, {}, {
      headers: this.getAdminActorHeaders()
    });
  }

  deactivateMedicament(id: string): Observable<Medicament> {
    return this.http.patch<Medicament>(`${this.API_URL}/${id}/deactivate`, {}, {
      headers: this.getAdminActorHeaders()
    });
  }

  updatePhoto(id: string, photoUrl: string): Observable<Medicament> {
    const params = new HttpParams().set('photoUrl', photoUrl);
    return this.http.patch<Medicament>(`${this.API_URL}/${id}/photo`, {}, {
      params,
      headers: this.getAdminActorHeaders()
    });
  }

  updateNotice(id: string, notice: string): Observable<Medicament> {
    const params = new HttpParams().set('notice', notice);
    return this.http.patch<Medicament>(`${this.API_URL}/${id}/notice`, {}, {
      params,
      headers: this.getAdminActorHeaders()
    });
  }

  // ========== DELETE ==========

  deleteMedicament(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  // ========== COUNT ==========

  countMedicaments(): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/count`);
  }

  private getAdminActorHeaders(): HttpHeaders {
    const actorEmail = this.authService.getCurrentUserValue()?.email;
    return actorEmail
      ? new HttpHeaders({ 'X-Admin-Actor': actorEmail })
      : new HttpHeaders();
  }
}
