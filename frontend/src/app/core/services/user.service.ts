import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}