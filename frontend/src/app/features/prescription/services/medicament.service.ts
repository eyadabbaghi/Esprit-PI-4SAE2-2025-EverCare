import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Medicament, MedicamentRequest } from '../models/medicament.model';

@Injectable({
  providedIn: 'root'
})
export class MedicamentService {

  private readonly API_URL = 'http://localhost:8089/EverCare/medicaments';

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
