import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { DailyEntry } from '../models/daily-entry.model';

@Injectable({ providedIn: 'root' })
export class DailyMeService {

  private baseUrl = 'http://localhost:8089/api/daily-entries';

  // ✅ Patient mode uses subject
  private entriesSubject = new BehaviorSubject<DailyEntry[]>([]);
  entries$ = this.entriesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ✅ Patient: load my own entries into BehaviorSubject
  init(patientId: string): void {
    if (!patientId) {
      this.entriesSubject.next([]);
      return;
    }

    this.http.get<DailyEntry[]>(`${this.baseUrl}/patient/${patientId}`)
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (list) => this.entriesSubject.next(list || []),
        error: (err) => console.error('Load entries failed', err)
      });
  }

  // ✅ Doctor: fetch entries without subject
  getEntriesByPatient(patientId: string): Observable<DailyEntry[]> {
    if (!patientId) return of([]);
    return this.http.get<DailyEntry[]>(`${this.baseUrl}/patient/${patientId}`)
      .pipe(catchError(() => of([])));
  }

  addEntry(entry: DailyEntry): Observable<DailyEntry> {
    return this.http.post<DailyEntry>(this.baseUrl, entry).pipe(
      tap(() => this.init(entry.patientId))
    );
  }

  updateEntry(entry: DailyEntry): Observable<DailyEntry> {
    return this.http.put<DailyEntry>(`${this.baseUrl}/${entry.id}`, entry).pipe(
      tap(() => this.init(entry.patientId))
    );
  }

  // ✅ Patient delete: optimistic + no JSON parse errors
  deleteEntry(id: number, patientId: string): Observable<any> {
    const prev = this.entriesSubject.value;

    // ✅ remove instantly from UI
    this.entriesSubject.next(prev.filter(e => Number(e.id) !== Number(id)));

    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' }).pipe(
      tap(() => {
        // optional: re-sync to be 100% sure
        // this.init(patientId);
      }),
      catchError(err => {
        // rollback if real failure
        this.entriesSubject.next(prev);
        return throwError(() => err);
      })
    );
  }

  destroy(): void {
    this.entriesSubject.next([]);
  }
}
