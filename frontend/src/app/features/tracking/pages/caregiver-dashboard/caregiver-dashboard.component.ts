import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  DoctorPatientVm,
  TrackingAlertDto,
  TrackingDangerDurationDto,
  TrackingDashboardService,
  TrackingPingDto,
  TrackingStatus
} from '../../services/tracking-dashboard.service';
import { Patient, UserService } from '../../../../core/services/user.service';

type AssistantAction = 'use-current-location' | 'save-current-location' | 'open-add-safe-zone' | 'lost';

@Component({
  selector: 'app-caregiver-dashboard',
  templateUrl: './caregiver-dashboard.component.html',
  styleUrls: ['./caregiver-dashboard.component.css']
})
export class CaregiverDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  patients: DoctorPatientVm[] = [];
  selectedPatient: DoctorPatientVm | null = null;
  alerts: Array<{ label: string; severity: string; time: string; date: string }> = [];
  history: TrackingPingDto[] = [];
  safeZones: any[] = [];
  dangerDuration: TrackingDangerDurationDto | null = null;

  showToast = false;
  toastMessage = '';

  private leaflet: any;
  private refreshInterval: any;
  private guidanceLayer: any = null;

  @ViewChild('caregiverMap') caregiverMap!: ElementRef;

  map: any = null;
  mapLayer: any = null;
  currentMarker: any = null;
  currentPulse: any = null;

  guidanceMessage = '';

  constructor(
    private readonly trackingDashboardService: TrackingDashboardService,
    private readonly userService: UserService,
    private readonly http: HttpClient,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ensureMapStyles();
    this.loadPatients();

    this.refreshInterval = setInterval(() => {
      this.loadPatients();
      if (this.selectedPatient) {
        this.loadPatientDetails(this.selectedPatient.patientId);
      }
    }, 5000);
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => this.initializeMap(), 150);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  getStatus(p: Partial<TrackingPingDto> | null | undefined): TrackingStatus {
    return this.trackingDashboardService.getStatus(p);
  }

  getStatusClass(p: Partial<TrackingPingDto> | null | undefined) {
    return this.getStatus(p).toLowerCase();
  }

  getPatientName(p: DoctorPatientVm | null): string {
    if (!p) return 'Patient';
    if (p.firstName && p.lastName) return `${p.firstName} ${p.lastName}`;
    return `Patient ${(p.patientId || '').toString().substring(0, 8)}`;
  }

  getPatientIdShort(p: DoctorPatientVm | null): string {
    if (!p?.patientId) return 'N/A';
    return p.patientId.toString().substring(0, 8);
  }

  getMovementStatus(): string {
    if (!this.selectedPatient?.speed && this.selectedPatient?.speed !== 0) return 'Unknown';
    const speed = this.selectedPatient.speed ?? 0;
    if (speed >= 10) return 'Fast';
    if (speed < 0.5) return 'Idle';
    return 'Moving';
  }

  getAlertSeverityClass(severity?: string) {
    const value = (severity || 'medium').toLowerCase();
    if (value === 'critical' || value === 'high') return 'danger';
    if (value === 'warning' || value === 'medium') return 'warning';
    return 'safe';
  }

  getDangerDurationLabel(): string {
    const minutes = this.dangerDuration?.minutes ?? 0;
    return `${minutes} min`;
  }

  getDangerDurationLevel(): string {
    return (this.dangerDuration?.level || 'LOW').toUpperCase();
  }

  getDangerDurationLevelClass(): string {
    return this.getDangerDurationLevel().toLowerCase();
  }

  handleAssistantAction(action: AssistantAction) {
    if (action === 'lost') {
      this.triggerGuidance('Follow the path to reach your safe zone');
    }
  }

  triggerGuidance(messageOverride?: string) {
    if (!this.selectedPatient) return;

    const nearest = this.findNearestSafeZone();
    if (!nearest) {
      this.clearGuidance();
      return;
    }

    const { place, distance } = nearest;
    const message = messageOverride || `You are ${Math.round(distance)} meters away from your safe zone`;
    this.guidanceMessage = message;

    this.ensureGuidanceLayer();
    this.guidanceLayer.clearLayers();

    const currentPoint: [number, number] = [this.selectedPatient.lat, this.selectedPatient.lng];
    const zonePoint: [number, number] = [Number(place.lat), Number(place.lng)];

    this.leaflet.polyline([currentPoint, zonePoint], {
      color: '#ef4444',
      weight: 4,
      opacity: 0.9,
      dashArray: '6 6'
    }).addTo(this.guidanceLayer);

    this.leaflet.circleMarker(zonePoint, {
      radius: 8,
      color: '#ef4444',
      fillColor: '#fee2e2',
      fillOpacity: 1,
      weight: 3
    }).addTo(this.guidanceLayer)
      .bindTooltip(place.label || 'Safe zone', { direction: 'top', opacity: 0.95 });
  }

  private loadPatients() {
    const providerEmail = this.getProviderEmail();
    const providerRole = this.getProviderRole();

    forkJoin({
      trackedPatients: this.trackingDashboardService.getLatestPatients().pipe(
        catchError((error) => {
          console.error('failed loading tracked patients', error);
          return of([] as DoctorPatientVm[]);
        })
      ),
      linkedPatients: this.userService.getLinkedPatientsForProvider(providerEmail, providerRole).pipe(
        catchError((error) => {
          console.error('failed loading linked patients', error);
          return of([] as Patient[]);
        })
      )
    }).subscribe({
      next: ({ trackedPatients, linkedPatients }) => {
        const linkedPatientIds = new Set(
          (linkedPatients || []).map((patient) => patient.userId).filter(Boolean)
        );
        const patients = linkedPatientIds.size
          ? trackedPatients.filter((patient) => linkedPatientIds.has(patient.patientId))
          : (trackedPatients || []);
        const linkedById = new Map(
          (linkedPatients || []).map((patient) => [patient.userId, patient] as const)
        );
        const resolvedPatients = (patients.length ? patients : (linkedPatients || []).map((patient) =>
          this.toPatientPlaceholder(patient)
        )).map((patient) => {
          const linkedPatient = linkedById.get(patient.patientId);

          if (!linkedPatient) {
            return patient;
          }

          const name = String(linkedPatient.name || linkedPatient.email || patient.name || '').trim();
          const parts = name.split(/\s+/).filter(Boolean);

          return {
            ...patient,
            name: name || patient.name,
            firstName: parts[0] || patient.firstName,
            lastName: parts.length > 1 ? parts.slice(1).join(' ') : patient.lastName
          };
        });
        this.patients = resolvedPatients;

        if (
          this.selectedPatient?.patientId &&
          !this.patients.some((patient) => patient.patientId === this.selectedPatient?.patientId)
        ) {
          this.selectedPatient = null;
        }

        if (!this.selectedPatient && this.patients.length > 0) {
          this.selectPatient(this.patients[0]);
        }
      }
    });
  }

  private selectPatient(patient: DoctorPatientVm) {
    this.selectedPatient = patient;
    this.loadPatientDetails(patient.patientId);
  }

  private loadPatientDetails(patientId: string) {
    this.trackingDashboardService.getPatientStatus(patientId).subscribe({
      next: (patientStatus) => {
        if (!patientStatus) return;
        this.selectedPatient = patientStatus;
        this.refreshMapLayers(true);
        this.updateGuidanceIfOutside();
      }
    });

    this.loadAlerts(patientId);
    this.loadHistory(patientId);
    this.loadSafeZones(patientId);
    this.loadDangerDuration(patientId);
  }

  private loadAlerts(patientId: string) {
    this.trackingDashboardService.getPatientAlerts(patientId).subscribe({
      next: (data: TrackingAlertDto[]) => {
        this.alerts = data.map(a => ({
          label: a.message || a.text || 'Alert',
          severity: a.severity || 'medium',
          time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : (a.time || 'N/A'),
          date: a.timestamp ? new Date(a.timestamp).toLocaleDateString() : (a.date || 'N/A')
        }));
      }
    });
  }

  private loadHistory(patientId: string) {
    this.trackingDashboardService.getPatientHistory(patientId).subscribe({
      next: (history) => {
        this.history = history.slice(0, 5);
      }
    });
  }

  private loadSafeZones(patientId: string) {
    this.http
      .get<any[]>(`http://localhost:8089/tracking/saved-places/patient/${patientId}`)
      .subscribe({
        next: (zones) => {
          this.safeZones = zones || [];
          this.refreshMapLayers();
          this.updateGuidanceIfOutside();
        },
        error: () => {
          this.safeZones = this.getCachedSafeZones(patientId);
          this.refreshMapLayers();
          this.updateGuidanceIfOutside();
        }
      });
  }

  private loadDangerDuration(patientId: string) {
    this.trackingDashboardService.getDangerDuration(patientId).subscribe({
      next: (dangerDuration) => {
        this.dangerDuration = dangerDuration;
      }
    });
  }

  private updateGuidanceIfOutside() {
    if (!this.selectedPatient) return;
    const status = this.getStatus(this.selectedPatient);
    if (status === 'SAFE') {
      this.clearGuidance();
      return;
    }
    this.triggerGuidance();
  }

  private async initializeMap() {
    const leafletLib = await this.ensureLeaflet();
    if (!this.caregiverMap?.nativeElement) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.map = leafletLib.map(this.caregiverMap.nativeElement, {
      zoomControl: true,
      attributionControl: false
    }).setView([36.8065, 10.1815], 13);

    leafletLib.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.mapLayer = leafletLib.layerGroup().addTo(this.map);
    this.ensureGuidanceLayer();
    this.refreshMapLayers(true);
    setTimeout(() => this.map.invalidateSize(), 120);
  }

  private refreshMapLayers(centerOnPatient = false) {
    if (!this.map || !this.leaflet || !this.mapLayer) return;
    if (!this.selectedPatient) return;

    this.mapLayer.clearLayers();

    const currentPoint: [number, number] = [this.selectedPatient.lat, this.selectedPatient.lng];

    this.currentPulse = this.leaflet.circle(currentPoint, {
      radius: 120,
      color: '#93c5fd',
      fillColor: '#60a5fa',
      fillOpacity: 0.12,
      weight: 1
    }).addTo(this.mapLayer);

    this.currentMarker = this.leaflet.circleMarker(currentPoint, {
      radius: 9,
      color: '#1d4ed8',
      fillColor: '#2563eb',
      fillOpacity: 1,
      weight: 3
    }).addTo(this.mapLayer);

    this.safeZones.forEach((zone) => {
      const zonePoint: [number, number] = [Number(zone.lat), Number(zone.lng)];
      const radius = Number(zone.radius) || 350;

      this.leaflet.circle(zonePoint, {
        radius,
        color: '#7c3aed',
        fillColor: '#a78bfa',
        fillOpacity: 0.12,
        weight: 2
      }).addTo(this.mapLayer);
    });

    if (centerOnPatient) {
      this.map.setView(currentPoint, Math.max(this.map.getZoom(), 14));
    }
  }

  private ensureGuidanceLayer() {
    if (!this.map || !this.leaflet) return;
    if (!this.guidanceLayer) {
      this.guidanceLayer = this.leaflet.layerGroup().addTo(this.map);
    }
  }

  private clearGuidance() {
    this.guidanceMessage = '';
    if (this.guidanceLayer) this.guidanceLayer.clearLayers();
  }

  private findNearestSafeZone() {
    if (!this.selectedPatient || this.safeZones.length === 0) return null;

    let nearest: any = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const zone of this.safeZones) {
      const dist = this.getDistance(
        this.selectedPatient.lat,
        this.selectedPatient.lng,
        Number(zone.lat),
        Number(zone.lng)
      );
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearest = zone;
      }
    }

    if (!nearest) return null;
    return { place: nearest, distance: nearestDistance };
  }

  private getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lng2 - lng1) * Math.PI / 180;

    const a =
      Math.sin(deltaPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private ensureMapStyles() {
    this.ensureRuntimeStylesheet('leaflet-runtime-css', 'assets/vendor/leaflet.css');
  }

  private ensureRuntimeStylesheet(id: string, href: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  private async ensureLeaflet() {
    if (!this.leaflet) {
      this.leaflet = await import('leaflet');
    }
    return this.leaflet;
  }

  private showToastMessage(message: string) {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 2400);
  }

  private getCachedSafeZones(patientId: string) {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(`places_${patientId}`) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private toPatientPlaceholder(patient: Patient): DoctorPatientVm {
    const name = String(patient.name || patient.email || '').trim() || `Patient ${patient.userId}`;
    const parts = name.split(/\s+/).filter(Boolean);

    return {
      patientId: patient.userId,
      lat: 0,
      lng: 0,
      name,
      firstName: parts[0],
      lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined,
      status: 'SAFE',
      riskScore: 0
    };
  }

  private getProviderEmail(): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('current_user') || '{}');
      return String(storedUser?.email || '').trim().toLowerCase();
    } catch {
      return '';
    }
  }

  private getProviderRole(): string {
    if (typeof localStorage === 'undefined') {
      return '';
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('current_user') || '{}');
      return String(storedUser?.role || '').trim().toUpperCase();
    } catch {
      return '';
    }
  }
}
