import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

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

interface CachedTrackingPing extends TrackingPingDto {
  accuracyMeters?: number | null;
  source?: string;
}

@Injectable({ providedIn: 'root' })
export class TrackingDashboardService {

  private readonly apiBase = 'http://localhost:8089/tracking';

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
        ),
        map((patients) => patients.length ? patients : this.getLatestPatientsFromCache()),
        catchError((error) => {
          console.error('[DoctorDashboard] latest patients error', error);
          return of(this.getLatestPatientsFromCache());
        })
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
        map((data) => {
          const resolved = data || this.getCachedTrackingPing(patientId);
          return resolved ? this.toDoctorPatient(resolved) : null;
        }),

        catchError((error) => {
          console.error(`[DoctorDashboard] status error ${patientId}`, error);
          const cached = this.getCachedTrackingPing(patientId);
          return of(cached ? this.toDoctorPatient(cached) : null);
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
        ),
        map((history) => history?.length ? history : this.getCachedHistory(patientId)),
        catchError((error) => {
          console.error(`[DoctorDashboard] history error ${patientId}`, error);
          return of(this.getCachedHistory(patientId));
        })
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
        map((alerts) => alerts?.length ? alerts : this.getCachedAlerts(patientId)),
        catchError((error) => {
          console.error(`[DoctorDashboard] alerts error ${patientId}`, error);
          return of(this.getCachedAlerts(patientId));
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

  private getLatestPatientsFromCache(): DoctorPatientVm[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const cachedPatients: DoctorPatientVm[] = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith('tracking_live_position_')) {
        continue;
      }

      const patientId = key.replace('tracking_live_position_', '');
      const cachedPing = this.getCachedTrackingPing(patientId);

      if (cachedPing) {
        cachedPatients.push(this.toDoctorPatient(cachedPing));
      }
    }

    return cachedPatients.sort(
      (left, right) =>
        new Date(right.timestamp ?? 0).getTime() -
        new Date(left.timestamp ?? 0).getTime()
    );
  }

  private getCachedTrackingPing(patientId: string): CachedTrackingPing | null {
    if (typeof localStorage === 'undefined' || !patientId) {
      return null;
    }

    try {
      const raw = localStorage.getItem(`tracking_live_position_${patientId}`);
      if (!raw) {
        return this.getCachedHistory(patientId)[0] || null;
      }

      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.lat !== 'number' ||
        typeof parsed?.lng !== 'number'
      ) {
        return null;
      }

      return {
        patientId: parsed.patientId || patientId,
        lat: parsed.lat,
        lng: parsed.lng,
        timestamp: parsed.timestamp || new Date().toISOString(),
        insideSafeZone: parsed.insideSafeZone,
        riskScore: parsed.riskScore,
        speed: parsed.speed,
        trend: parsed.trend,
        accuracyMeters: parsed.accuracyMeters,
        source: parsed.source || 'local-cache'
      };
    } catch {
      return null;
    }
  }

  private getCachedHistory(patientId: string): TrackingPingDto[] {
    if (typeof localStorage === 'undefined' || !patientId) {
      return [];
    }

    try {
      const raw = localStorage.getItem(`history_${patientId}`);
      const parsed = JSON.parse(raw || '[]');

      return (Array.isArray(parsed) ? parsed : [])
        .map((entry) => ({
          patientId,
          lat: Number(entry?.lat),
          lng: Number(entry?.lng),
          timestamp: entry?.timestamp || this.toIsoTimestamp(entry?.date, entry?.time),
          insideSafeZone: entry?.status === 'SAFE',
          riskScore: entry?.status === 'DANGER' ? 80 : entry?.status === 'WARNING' ? 35 : 0,
          trend: entry?.status
        }))
        .filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lng))
        .sort(
          (left, right) =>
            new Date(right.timestamp ?? 0).getTime() -
            new Date(left.timestamp ?? 0).getTime()
        );
    } catch {
      return [];
    }
  }

  private getCachedAlerts(patientId: string): TrackingAlertDto[] {
    if (typeof localStorage === 'undefined' || !patientId) {
      return [];
    }

    try {
      const raw = localStorage.getItem(`alerts_${patientId}`);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private toIsoTimestamp(date?: string, time?: string) {
    if (!date && !time) {
      return new Date().toISOString();
    }

    const parsedDate = new Date(`${date || ''} ${time || ''}`.trim());
    const parsedTime = parsedDate.getTime();

    if (!Number.isFinite(parsedTime)) {
      return new Date().toISOString();
    }

    return parsedDate.toISOString();
  }

  // ================= REQUEST OPTIONS =================
  private requestOptions() {
    return {
      headers: this.noCacheHeaders,
      params: new HttpParams().set('_', Date.now().toString())
    };
  }
}
