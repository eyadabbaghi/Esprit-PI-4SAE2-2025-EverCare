import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../features/front-office/pages/login/auth.service';

export interface Patient {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  role?: string;
  // Relationship fields (for patients)
  caregiverEmails?: string[];
  doctorEmail?: string;
  // For caregivers/doctors
  patientEmails?: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = 'http://localhost:8089/EverCare/users';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders() {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.baseUrl}/search`, {
      params: { q: '', role: 'PATIENT' },
      headers: this.getHeaders()
    });
  }

  getLinkedPatientsForProvider(providerEmail: string, providerRole?: string): Observable<Patient[]> {
    const normalizedEmail = String(providerEmail || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return of([]);
    }

    return forkJoin({
      allPatients: this.getPatients().pipe(catchError(() => of([] as Patient[]))),
      provider: this.getUserByEmail(normalizedEmail).pipe(catchError(() => of(null)))
    }).pipe(
      switchMap(({ allPatients, provider }) => {
        const role = String(providerRole || provider?.role || '').trim().toUpperCase();
        const linkedPatientEmails = new Set(
          (provider?.patientEmails || [])
            .map((email) => this.normalizeEmail(email))
            .filter(Boolean)
        );

        const linkedPatients = (allPatients || []).filter((patient) => {
          const patientEmail = this.normalizeEmail(patient.email);
          const doctorMatch = this.normalizeEmail(patient.doctorEmail) === normalizedEmail;
          const caregiverMatch = (patient.caregiverEmails || [])
            .map((email) => this.normalizeEmail(email))
            .includes(normalizedEmail);

          if (role === 'DOCTOR') {
            return doctorMatch || linkedPatientEmails.has(patientEmail);
          }

          if (role === 'CAREGIVER') {
            return caregiverMatch || linkedPatientEmails.has(patientEmail);
          }

          return doctorMatch || caregiverMatch || linkedPatientEmails.has(patientEmail);
        });

        if (!linkedPatients.length && (role === 'DOCTOR' || role === 'CAREGIVER')) {
          return of(this.getNonTestPatients(allPatients));
        }

        const knownEmails = new Set(
          linkedPatients.map((patient) => this.normalizeEmail(patient.email)).filter(Boolean)
        );
        const missingPatientEmails = Array.from(linkedPatientEmails).filter(
          (email) => !knownEmails.has(email)
        );

        if (!missingPatientEmails.length) {
          return of(linkedPatients);
        }

        return forkJoin(
          missingPatientEmails.map((email) =>
            this.getUserByEmail(email).pipe(catchError(() => of(null)))
          )
        ).pipe(
          map((extraPatients) => {
            const merged = [...linkedPatients, ...(extraPatients || [])];
            const byId = new Map<string, Patient>();

            merged.forEach((patient) => {
              if (patient?.userId) {
                byId.set(patient.userId, patient);
              }
            });

            return Array.from(byId.values());
          })
        );
      }),
      catchError(() => of([]))
    );
  }

  getUserByEmail(email: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/by-email`, {
      params: { email },
      headers: this.getHeaders()
    });
  }

  getUserById(userId: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/${userId}`, {
      headers: this.getHeaders()
    });
  }

  private normalizeEmail(value?: string) {
    return String(value || '').trim().toLowerCase();
  }

  private getNonTestPatients(patients: Patient[]) {
    return (patients || []).filter((patient) => !this.isCodexTestUser(patient));
  }

  private isCodexTestUser(patient: Patient) {
    const name = String(patient?.name || '').trim().toLowerCase();
    const email = this.normalizeEmail(patient?.email);
    return name.includes('codex') || email.includes('codex');
  }
}
