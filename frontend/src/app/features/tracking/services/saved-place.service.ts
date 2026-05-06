import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SavedPlace } from '../models/saved-place.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SavedPlaceService {

  private baseUrl = environment.apiUrl + '/tracking/saved-places';

  constructor(private http: HttpClient) {}

  add(place: SavedPlace): Observable<SavedPlace> {
    return this.http.post<SavedPlace>(this.baseUrl, place);
  }

  getByPatient(patientId: string): Observable<SavedPlace[]> {
    return this.http.get<SavedPlace[]>(`${this.baseUrl}/patient/${patientId}`);
  }

  update(id: number, place: SavedPlace): Observable<SavedPlace> {
    return this.http.put<SavedPlace>(`${this.baseUrl}/${id}`, place);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
