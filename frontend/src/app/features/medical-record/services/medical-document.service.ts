import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MedicalDocument } from '../models/medical-document.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MedicalDocumentService {
  private readonly baseUrl = environment.medicalRecordApiUrl;

  constructor(private readonly http: HttpClient) {}

  listByRecord(recordId: string): Observable<MedicalDocument[]> {
    return this.http.get<MedicalDocument[]>(`${this.baseUrl}/${recordId}/documents`);
  }

  upload(recordId: string, file: File): Observable<MedicalDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<MedicalDocument>(`${this.baseUrl}/${recordId}/documents`, formData);
  }

  download(recordId: string, documentId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.baseUrl}/${recordId}/documents/${documentId}/download`, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  delete(recordId: string, documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${recordId}/documents/${documentId}`);
  }
}
