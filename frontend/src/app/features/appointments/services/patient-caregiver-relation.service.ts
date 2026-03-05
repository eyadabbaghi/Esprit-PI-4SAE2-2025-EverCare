// services/caregiver-patient.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';

import { User } from '../models/user';
import { AuthService } from '../../front-office/pages/login/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CaregiverPatientService {

  private baseUrl ="http://localhost:8089/EverCare";

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('CaregiverPatientService initialized with baseUrl:', this.baseUrl);
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    console.log('Token being used:', token ? 'Token exists' : 'No token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Get patients assigned to a caregiver using the relationship
   */
  getPatientsByCaregiverId(caregiverId: string): Observable<User[]> {
    const url = `${this.baseUrl}/users/${caregiverId}/patients`;
    console.log('Making request to:', url);

    return this.http.get<User[]>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(patients => {
        console.log('Patients received:', patients);
        return patients;
      }),
      catchError(error => {
        console.error('Error in getPatientsByCaregiverId:', error);
        throw error;
      })
    );
  }

  /**
   * Get caregiver details including patients
   */
  getCaregiverWithPatients(caregiverId: string): Observable<User> {
    const url = `${this.baseUrl}/users/${caregiverId}`;
    console.log('Making request to:', url);

    return this.http.get<User>(url, {
      headers: this.getHeaders()
    }).pipe(
      map(caregiver => {
        console.log('Caregiver received:', caregiver);
        return caregiver;
      }),
      catchError(error => {
        console.error('Error in getCaregiverWithPatients:', error);
        throw error;
      })
    );
  }

  /**
   * Test connection to backend
   */
  testConnection(): Observable<any> {
    const url = `${this.baseUrl}/users`;
    console.log('Testing connection to:', url);

    return this.http.get(url, {
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        console.log('Connection test successful:', response);
        return response;
      }),
      catchError(error => {
        console.error('Connection test failed:', error);
        throw error;
      })
    );
  }
}
