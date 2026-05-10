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
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import {
  DoctorPatientVm,
  TrackingAlertDto,
  TrackingDangerDurationDto,
  TrackingDashboardService,
  TrackingPingDto,
  TrackingStatus
} from '../../services/tracking-dashboard.service';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { CheckService, CheckSignalMessage } from '../../../front-office/pages/alerts/services/check.service';

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
  associatedPatients: User[] = [];
  currentUser: User | null = null;
  showAssociatePatientModal = false;
  patientEmailToAssociate = '';
  isAssociatingPatient = false;
  associationMessage = '';
  isMonitoringLoading = false;
  checkStatus: 'idle' | 'waiting' | 'streaming' | 'cancelled' | 'snapshot' = 'idle';
  snapshotImage: string | null = null;
  isListeningForGuidance = false;

  private leaflet: any;
  private refreshInterval: any;
  private guidanceLayer: any = null;
  private readonly patientProfileByIdentifier = new Map<string, User>();
  private authSub?: Subscription;
  private checkSub?: Subscription;
  private pc?: RTCPeerConnection;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private lastSafeZoneAlertKey = '';
  private isMapInitializing = false;

  @ViewChild('caregiverMap') caregiverMap!: ElementRef;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;

  map: any = null;
  mapLayer: any = null;
  currentMarker: any = null;
  currentPulse: any = null;

  guidanceMessage = '';

  constructor(
    private readonly trackingDashboardService: TrackingDashboardService,
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly checkService: CheckService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ensureMapStyles();
    this.authSub = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.loadAssociatedPatients();
    });

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
    this.authSub?.unsubscribe();
    this.checkSub?.unsubscribe();
    this.pc?.close();
    this.checkService.disconnect();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  getStatus(p: Partial<TrackingPingDto> | null | undefined): TrackingStatus {
    return this.trackingDashboardService.getStatus(p);
  }

  getStatusClass(p: Partial<TrackingPingDto> | null | undefined) {
    if (!this.hasLiveTrackingData(p)) {
      return 'pending';
    }
    return this.getStatus(p).toLowerCase();
  }

  getStatusLabel(p: Partial<TrackingPingDto> | null | undefined): string {
    return this.hasLiveTrackingData(p) ? this.getStatus(p) : 'WAITING';
  }

  getPatientName(p: DoctorPatientVm | null): string {
    const profile = this.getPatientProfile(p);
    if (profile?.name) return profile.name;
    if (profile?.email) return profile.email;
    if (!p) return 'Patient';
    if (p.name && !p.name.startsWith('Patient ')) return p.name;
    if (p.firstName && p.lastName) return `${p.firstName} ${p.lastName}`;
    return 'Patient';
  }

  getPatientAvatar(p: DoctorPatientVm | null): string {
    return this.resolveAvatarUrl(this.getPatientProfile(p)?.profilePicture);
  }

  handlePatientAvatarError(): void {
    const profile = this.getPatientProfile(this.selectedPatient);
    if (profile) {
      profile.profilePicture = undefined;
    }
  }

  getMovementStatus(): string {
    if (!this.hasLiveTrackingData(this.selectedPatient)) return 'Waiting for location';
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
    if (!this.hasLiveTrackingData(this.selectedPatient)) return 'Waiting';
    const minutes = this.dangerDuration?.minutes ?? 0;
    return `${minutes} min`;
  }

  getDangerDurationLevel(): string {
    if (!this.hasLiveTrackingData(this.selectedPatient)) return 'PENDING';
    return (this.dangerDuration?.level || 'LOW').toUpperCase();
  }

  getDangerDurationLevelClass(): string {
    return this.getDangerDurationLevel().toLowerCase();
  }

  handleAssistantAction(action: AssistantAction) {
    if (action === 'lost') {
      this.beginGuideBack();
    }
  }

  beginGuideBack(): void {
    this.triggerGuidance('Follow the path to reach your safe zone');
    this.startCheckIn();
    this.startVoiceGuide();
  }

  startMonitoring(): void {
    this.loadPatients(true);
    if (this.selectedPatient) {
      this.loadPatientDetails(this.selectedPatient.patientId);
    }
  }

  getRiskScoreLabel(): string {
    if (!this.hasLiveTrackingData(this.selectedPatient)) return 'Waiting';
    return String(this.selectedPatient?.riskScore ?? 0);
  }

  getLastSeenLabel(): string {
    if (!this.hasLiveTrackingData(this.selectedPatient) || !this.selectedPatient?.timestamp) {
      return 'Waiting for ping';
    }
    return new Date(this.selectedPatient.timestamp).toLocaleString();
  }

  getLocationChipLabel(): string {
    if (!this.hasLiveTrackingData(this.selectedPatient)) {
      return 'Waiting for location';
    }
    return `${this.selectedPatient?.lat.toFixed(3)}, ${this.selectedPatient?.lng.toFixed(3)}`;
  }

  selectAssociatedPatientProfile(patient: User): void {
    this.loadStatusForAssociatedPatient(patient).subscribe((trackingPatient) => {
      this.selectPatient(trackingPatient);
      this.showToastMessage(`${patient.name || 'Patient'} selected.`);
    });
  }

  triggerGuidance(messageOverride?: string) {
    if (!this.selectedPatient) return;

    const nearest = this.findNearestSafeZone();
    if (!nearest) {
      this.clearGuidance();
      return;
    }

    const { place, distance } = nearest;
    const patientName = this.getPatientName(this.selectedPatient);
    const message = messageOverride || `${patientName} is ${Math.round(distance)} meters away from the safe zone`;
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

  openAssociatePatientModal(): void {
    this.associationMessage = '';
    this.patientEmailToAssociate = '';
    this.showAssociatePatientModal = true;
  }

  closeAssociatePatientModal(): void {
    if (this.isAssociatingPatient) return;
    this.showAssociatePatientModal = false;
  }

  associatePatient(): void {
    const email = this.patientEmailToAssociate.trim();
    if (!email) {
      this.associationMessage = 'Enter the patient email first.';
      return;
    }

    this.isAssociatingPatient = true;
    this.associationMessage = '';
    this.authService.updateProfile({ connectedEmail: email }).subscribe({
      next: () => {
        this.showToastMessage('Patient associated successfully.');
        this.isAssociatingPatient = false;
        this.showAssociatePatientModal = false;
        this.loadAssociatedPatients();
      },
      error: () => {
        this.isAssociatingPatient = false;
        this.associationMessage = 'Could not associate this patient. Check the email and try again.';
      }
    });
  }

  async startCheckIn(): Promise<void> {
    if (!this.currentUser?.userId || !this.selectedPatient?.patientId) {
      this.showToastMessage('Select an associated patient first.');
      return;
    }

    this.checkService.connect(this.currentUser.userId);
    if (!this.checkSub) {
      this.checkSub = this.checkService.signal$.subscribe((msg) => this.handleCheckSignal(msg));
    }

    this.checkStatus = 'waiting';
    this.snapshotImage = null;
    this.pendingCandidates = [];

    this.pc?.close();
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.pc.ontrack = (event) => {
      this.checkStatus = 'streaming';
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      if (this.remoteVideoRef?.nativeElement) {
        this.remoteVideoRef.nativeElement.srcObject = stream;
        this.remoteVideoRef.nativeElement.play().catch(() => undefined);
      }
    };

    this.pc.onicecandidate = (event) => {
      if (!event.candidate || !this.currentUser?.userId || !this.selectedPatient?.patientId) return;
      this.checkService.send({
        type: 'ice-candidate',
        from: this.currentUser.userId,
        to: this.selectedPatient.patientId,
        payload: event.candidate
      });
    };

    this.pc.addTransceiver('video', { direction: 'recvonly' });
    await this.checkService.waitForConnection();

    this.checkService.send({
      type: 'check-request',
      from: this.currentUser.userId,
      to: this.selectedPatient.patientId
    });

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.checkService.send({
      type: 'offer',
      from: this.currentUser.userId,
      to: this.selectedPatient.patientId,
      payload: offer
    });
  }

  stopCheckIn(): void {
    this.pc?.close();
    this.pc = undefined;
    this.checkStatus = 'idle';
    if (this.remoteVideoRef?.nativeElement) {
      this.remoteVideoRef.nativeElement.srcObject = null;
    }
  }

  async startVoiceGuide(): Promise<void> {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      this.showToastMessage('Voice guidance is not supported in this browser.');
      return;
    }

    if (!this.currentUser?.userId || !this.selectedPatient?.patientId) {
      this.showToastMessage('Select an associated patient first.');
      return;
    }

    this.checkService.connect(this.currentUser.userId);
    if (!this.checkSub) {
      this.checkSub = this.checkService.signal$.subscribe((msg) => this.handleCheckSignal(msg));
    }

    try {
      await this.checkService.waitForConnection();
    } catch {
      this.showToastMessage('Voice guidance is not connected yet. Try again.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim();
      this.isListeningForGuidance = false;
      if (!text || !this.currentUser?.userId || !this.selectedPatient?.patientId) return;
      this.checkService.send({
        type: 'voice-guide',
        from: this.currentUser.userId,
        to: this.selectedPatient.patientId,
        payload: { text }
      });
      this.showToastMessage('Voice guidance sent to the patient.');
    };
    recognition.onerror = () => {
      this.isListeningForGuidance = false;
      this.showToastMessage('Could not capture voice guidance.');
    };
    recognition.onend = () => {
      this.isListeningForGuidance = false;
    };
    try {
      this.isListeningForGuidance = true;
      recognition.start();
    } catch {
      this.isListeningForGuidance = false;
      this.showToastMessage('Could not start voice guidance.');
    }
  }

  private loadPatients(showLoading = false) {
    if (showLoading) {
      this.isMonitoringLoading = true;
    }

    if (this.associatedPatients.length === 0) {
      this.patients = [];
      this.selectedPatient = null;
      this.isMonitoringLoading = false;
      return;
    }

    this.ensureCaregiverMapReady();

    forkJoin(this.associatedPatients.map((patient) => this.loadStatusForAssociatedPatient(patient)))
      .pipe(finalize(() => {
        if (showLoading) {
          this.isMonitoringLoading = false;
          this.showToastMessage('Live monitoring refreshed.');
        }
      }))
      .subscribe({
        next: (patients) => {
          this.patients = patients.sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());
          const currentKey = String(this.selectedPatient?.patientId || '').trim().toLowerCase();
          const selected = currentKey
            ? this.patients.find((patient) => this.resolvePatientIdentifiers(this.getPatientProfile(patient) || {} as User).includes(currentKey) || patient.patientId.toLowerCase() === currentKey)
            : null;
          this.selectPatient(selected || this.patients[0]);
        },
        error: () => {
          this.patients = [];
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
        if (patientStatus) {
          this.selectedPatient = this.enrichTrackingPatient(patientStatus, this.getPatientProfile(this.selectedPatient));
        }
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
          this.safeZones = [];
          this.refreshMapLayers();
        },
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
    if (!this.hasLiveTrackingData(this.selectedPatient)) {
      this.clearGuidance();
      return;
    }
    if (this.safeZones.length === 0) {
      this.clearGuidance();
      return;
    }
    const status = this.getStatus(this.selectedPatient);
    if (status === 'SAFE') {
      this.clearGuidance();
      return;
    }
    this.triggerGuidance();
    this.notifySafeZoneAlert(status);
  }

  private loadAssociatedPatients(): void {
    const emails = this.uniqueNormalized(this.currentUser?.patientEmails || []);
    const currentEmail = String(this.currentUser?.email || '').trim().toLowerCase();
    const direct$ = emails.length
      ? forkJoin(emails.map((email) => this.authService.getUserByEmail(email).pipe(catchError(() => of(null)))))
      : of([]);

    forkJoin({
      direct: direct$,
      fallback: this.authService.searchUsersByRole('', 'PATIENT').pipe(catchError(() => of([])))
    })
      .pipe(
        map(({ direct, fallback }) => {
          const patientsByKey = new Map<string, User>();
          for (const patient of direct) {
            if (patient) {
              patientsByKey.set(this.userKey(patient), patient);
            }
          }
          for (const patient of fallback || []) {
            const caregiverEmails = this.uniqueNormalized(patient.caregiverEmails || []);
            if (currentEmail && caregiverEmails.some((email) => email.toLowerCase() === currentEmail)) {
              patientsByKey.set(this.userKey(patient), patient);
            }
          }
          return Array.from(patientsByKey.values());
        })
      )
      .subscribe({
        next: (patients) => {
          this.associatedPatients = patients;
          this.patientProfileByIdentifier.clear();
          patients.forEach((patient) => this.cachePatientProfile(patient));
          this.ensureCaregiverMapReady();
          this.loadPatients();
        },
        error: () => {
          this.associatedPatients = [];
          this.patientProfileByIdentifier.clear();
          this.loadPatients();
        }
      });
  }

  private notifySafeZoneAlert(status: TrackingStatus): void {
    if (!this.currentUser?.userId || !this.selectedPatient?.patientId) return;
    const key = `${this.selectedPatient.patientId}:${status}:${Math.floor(Date.now() / 600000)}`;
    if (key === this.lastSafeZoneAlertKey) return;
    this.lastSafeZoneAlertKey = key;

    const patientName = this.getPatientName(this.selectedPatient);
    this.showToastMessage(`${patientName} is outside the safe zone.`);
  }

  private loadStatusForAssociatedPatient(patient: User): Observable<DoctorPatientVm> {
    const candidates = this.resolvePatientIdentifiers(patient);
    return this.tryLoadPatientStatusCandidate(patient, candidates, 0);
  }

  private tryLoadPatientStatusCandidate(patient: User, candidates: string[], index: number): Observable<DoctorPatientVm> {
    if (index >= candidates.length) {
      return of(this.toPlaceholderPatient(patient));
    }

    const candidate = candidates[index];
    return this.trackingDashboardService.getPatientStatus(candidate).pipe(
      switchMap((trackingPatient) => {
        if (this.hasLiveTrackingData(trackingPatient)) {
          return of(this.enrichTrackingPatient(trackingPatient as DoctorPatientVm, patient));
        }

        return this.trackingDashboardService.getPatientHistory(candidate).pipe(
          map((history) => this.toLatestTrackingPatient(candidate, history, patient)),
          switchMap((latestFromHistory) => latestFromHistory
            ? of(latestFromHistory)
            : this.tryLoadPatientStatusCandidate(patient, candidates, index + 1)
          )
        );
      }),
      catchError(() => this.tryLoadPatientStatusCandidate(patient, candidates, index + 1))
    );
  }

  private toLatestTrackingPatient(candidate: string, history: TrackingPingDto[], profile: User): DoctorPatientVm | null {
    const latest = (history || [])
      .filter((ping) => typeof ping?.lat === 'number' && typeof ping?.lng === 'number')
      .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())[0];

    if (!latest) {
      return null;
    }

    return this.enrichTrackingPatient({
      ...latest,
      patientId: latest.patientId || candidate,
      name: profile.name || profile.email || `Patient ${candidate}`,
      status: this.getStatus(latest)
    }, profile);
  }

  private toPlaceholderPatient(patient: User): DoctorPatientVm {
    const patientId = this.primaryPatientIdentifier(patient);
    return {
      patientId,
      lat: 0,
      lng: 0,
      name: patient.name || patient.email || 'Patient',
      status: 'SAFE',
      riskScore: undefined,
      insideSafeZone: undefined,
      timestamp: undefined,
      speed: undefined,
    };
  }

  private enrichTrackingPatient(patient: DoctorPatientVm, profile?: User): DoctorPatientVm {
    return {
      ...patient,
      name: profile?.name || patient.name,
    };
  }

  private async handleCheckSignal(msg: CheckSignalMessage): Promise<void> {
    if (msg.type === 'answer') {
      await this.pc?.setRemoteDescription(new RTCSessionDescription(msg.payload));
      for (const candidate of this.pendingCandidates) {
        await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingCandidates = [];
    } else if (msg.type === 'ice-candidate') {
      if (this.pc?.remoteDescription) {
        await this.pc.addIceCandidate(new RTCIceCandidate(msg.payload));
      } else {
        this.pendingCandidates.push(msg.payload);
      }
    } else if (msg.type === 'cancel') {
      this.checkStatus = 'cancelled';
      this.pc?.close();
    } else if (msg.type === 'snapshot') {
      this.snapshotImage = msg.payload;
      this.checkStatus = 'snapshot';
    }
  }

  private async initializeMap() {
    if (this.isMapInitializing) return;
    this.isMapInitializing = true;

    try {
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
      this.scheduleMapResize();
    } finally {
      this.isMapInitializing = false;
    }
  }

  private refreshMapLayers(centerOnPatient = false) {
    if (!this.map || !this.leaflet || !this.mapLayer) return;
    this.scheduleMapResize();
    this.mapLayer.clearLayers();
    if (!this.selectedPatient || !this.hasLiveTrackingData(this.selectedPatient)) return;

    const currentPoint: [number, number] = [this.selectedPatient.lat, this.selectedPatient.lng];

    this.currentPulse = this.leaflet.circle(currentPoint, {
      radius: 120,
      color: '#c4b5fd',
      fillColor: '#a78bfa',
      fillOpacity: 0.08,
      weight: 1
    }).addTo(this.mapLayer);

    this.currentMarker = this.leaflet.circleMarker(currentPoint, {
      radius: 9,
      color: '#4c1d95',
      fillColor: '#7c3aed',
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

  private ensureCaregiverMapReady(): void {
    if (!isPlatformBrowser(this.platformId) || this.map || this.isMapInitializing || this.associatedPatients.length === 0) return;
    setTimeout(() => this.initializeMap(), 0);
  }

  private scheduleMapResize(): void {
    setTimeout(() => this.map?.invalidateSize(), 80);
    setTimeout(() => this.map?.invalidateSize(), 300);
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
    if (!this.selectedPatient || !this.hasLiveTrackingData(this.selectedPatient) || this.safeZones.length === 0) return null;

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

  private getPatientProfile(p: DoctorPatientVm | null): User | undefined {
    if (p?.patientId) {
      const exact = this.patientProfileByIdentifier.get(String(p.patientId).trim().toLowerCase());
      if (exact) {
        return exact;
      }
    }

    if (this.associatedPatients.length === 1) {
      return this.associatedPatients[0];
    }

    if (p?.name) {
      return this.patientProfileByIdentifier.get(String(p.name).trim().toLowerCase());
    }

    return undefined;
  }

  private cachePatientProfile(patient: User): void {
    for (const identifier of this.resolvePatientIdentifiers(patient)) {
      this.patientProfileByIdentifier.set(identifier, patient);
    }
  }

  private resolvePatientIdentifiers(patient: User): string[] {
    return this.uniqueNormalized([
      patient.userId || '',
      patient.keycloakId || '',
      patient.email || '',
      patient.name || ''
    ]).map((value) => value.toLowerCase());
  }

  private primaryPatientIdentifier(patient: User): string {
    return this.uniqueNormalized([
      patient.userId || '',
      patient.keycloakId || '',
      patient.email || '',
      patient.name || ''
    ])[0] || '';
  }

  private hasLiveTrackingData(p: Partial<TrackingPingDto> | null | undefined): boolean {
    if (!p) return false;
    return !!p.timestamp || (
      typeof p.lat === 'number' &&
      typeof p.lng === 'number' &&
      (p.lat !== 0 || p.lng !== 0)
    );
  }

  private uniqueNormalized(values: string[]): string[] {
    const seen = new Set<string>();
    return values
      .map((value) => String(value || '').trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private resolveAvatarUrl(value?: string): string {
    const avatar = String(value || '').trim();
    if (!avatar) return '/assets/default-avatar.png';
    if (/^(https?:|data:|blob:)/i.test(avatar)) return avatar;
    if (avatar.startsWith('/')) return avatar;
    return `/${avatar}`;
  }

  private userKey(user: User): string {
    return String(user.userId || user.keycloakId || user.email || user.name || '').trim().toLowerCase();
  }
}
