import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface TrackingPingDto {
  id?: number;
  patientId: string;
  lat: number;
  lng: number;
  timestamp?: string;
  insideSafeZone?: boolean;
  riskScore?: number;
  speed?: number;
  trend?: string;
}

export type TrackingStatus = 'SAFE' | 'WARNING' | 'DANGER';

export interface DoctorPatientVm extends TrackingPingDto {
  name: string;
  status: TrackingStatus;
  firstName?: string;
  lastName?: string;
}

export interface TrackingAlertDto {
  id?: number;
  patientId?: string;
  message?: string;
  severity?: string;
  timestamp?: string;
  text?: string;
  time?: string;
  date?: string;
}

export interface TrackingDangerDurationDto {
  minutes: number;
  level?: string;
}

@Injectable({ providedIn: 'root' })
export class TrackingDashboardService {

  private readonly apiBase = environment.apiUrl + '/tracking';

  private readonly noCacheHeaders = new HttpHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  });

  constructor(private readonly http: HttpClient) {}

  // ================= GET ALL PATIENTS =================
  getLatestPatients(): Observable<DoctorPatientVm[]> {
    return this.http
      .get<TrackingPingDto[]>(`${this.apiBase}/location-pings`, this.requestOptions())
      .pipe(
        tap((data) => console.log('[DoctorDashboard] backend /location-pings:', data)),

        // 🔥 extract unique patient IDs
        map((data) =>
          [...new Set((data ?? []).map((ping) => ping.patientId).filter(Boolean))]
        ),

        // 🔥 fetch latest status per patient
        switchMap((patientIds) => {
          if (patientIds.length === 0) return of([]);

          return forkJoin(patientIds.map((id) => this.getPatientStatus(id)));
        }),

        // 🔥 clean + sort
        map((patients) =>
          patients
            .filter((p): p is DoctorPatientVm => p !== null)
            .sort(
              (a, b) =>
                new Date(b.timestamp ?? 0).getTime() -
                new Date(a.timestamp ?? 0).getTime()
            )
        )
      );
  }

  // ================= GET SINGLE PATIENT =================
  getPatientStatus(patientId: string): Observable<DoctorPatientVm | null> {
    return this.http
      .get<TrackingPingDto | null>(
        `${this.apiBase}/location-pings/status/${patientId}`,
        this.requestOptions()
      )
      .pipe(
        tap((data) =>
          console.log(
            `[DoctorDashboard] status ${patientId}:`,
            data,
            'insideSafeZone=',
            data?.insideSafeZone,
            'riskScore=',
            data?.riskScore
          )
        ),

        map((data) => (data ? this.toDoctorPatient(data) : null)),

        catchError((error) => {
          console.error(`[DoctorDashboard] status error ${patientId}`, error);
          return of(null);
        })
      );
  }

  // ================= HISTORY =================
  getPatientHistory(patientId: string): Observable<TrackingPingDto[]> {
    return this.http
      .get<TrackingPingDto[]>(
        `${this.apiBase}/location-pings/patient/${patientId}`,
        this.requestOptions()
      )
      .pipe(
        tap((data) =>
          console.log(
            `[DoctorDashboard] history ${patientId}:`,
            data,
            'latest insideSafeZone=',
            data?.[0]?.insideSafeZone,
            'latest riskScore=',
            data?.[0]?.riskScore
          )
        )
      );
  }

  // ================= ALERTS =================
  getPatientAlerts(patientId: string): Observable<TrackingAlertDto[]> {
    return this.http
      .get<TrackingAlertDto[]>(
        `${this.apiBase}/alerts/patient/${patientId}`,
        this.requestOptions()
      )
      .pipe(
        tap((data) =>
          console.log(`[DoctorDashboard] alerts ${patientId}:`, data)
        ),
        catchError((error) => {
          console.error(`[DoctorDashboard] alerts error ${patientId}`, error);
          return of([]);
        })
      );
  }

  getDangerDuration(patientId: string): Observable<TrackingDangerDurationDto> {
    return this.http
      .get<TrackingDangerDurationDto>(
        `${this.apiBase}/danger-duration/${patientId}`,
        this.requestOptions()
      )
      .pipe(
        tap((data) =>
          console.log(`[DoctorDashboard] danger duration ${patientId}:`, data)
        ),
        catchError((error) => {
          console.error(`[DoctorDashboard] danger duration error ${patientId}`, error);
          return of({ minutes: 0, level: 'LOW' });
        })
      );
  }

  getStatus(ping: Partial<TrackingPingDto> | null | undefined): TrackingStatus {
    if (!ping) return 'SAFE';
    if (ping.insideSafeZone) return 'SAFE';
    if ((ping.riskScore ?? 0) >= 70) return 'DANGER';
    if ((ping.riskScore ?? 0) > 0) return 'WARNING';
    return 'SAFE';
  }

  // ================= 🔥 SMART STATUS =================
  private toDoctorPatient(ping: TrackingPingDto): DoctorPatientVm {
    return {
      ...ping,
      name: `Patient ${ping.patientId}`,
      status: this.getStatus(ping)
    };
  }

  // ================= REQUEST OPTIONS =================
  private requestOptions() {
    return {
      headers: this.noCacheHeaders,
      params: new HttpParams().set('_', Date.now().toString())
    };
  }
}
