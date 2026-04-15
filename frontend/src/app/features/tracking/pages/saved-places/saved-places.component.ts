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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import { Subscription, tap } from 'rxjs';
import {
  TrackingDashboardService,
  TrackingPingDto,
  TrackingStatus
} from '../../services/tracking-dashboard.service';

type AssistantAction = 'use-current-location' | 'save-current-location' | 'open-add-safe-zone' | 'lost';
type TrackingCluster = { lat: number; lng: number };
type BrowserLocationOptions = {
  centerSetupMap?: boolean;
  centerTrackingMap?: boolean;
  centerModalMap?: boolean;
  persistToBackend?: boolean;
  toastMessage?: string;
  silent?: boolean;
};

@Component({
  selector: 'app-saved-places',
  templateUrl: './saved-places.component.html',
  styleUrls: ['./saved-places.component.css']
})
export class SavedPlacesComponent implements OnInit, AfterViewInit, OnDestroy {
  user: any = null;
  patientId = 'default';
  showToast = false;
  toastMessage = '';

  mode: 'setup' | 'tracking' = 'setup';

  places: any[] = [];
  alerts: any[] = [];
  history: any[] = [];
  clusters: TrackingCluster[] = [];

  form: FormGroup;
  isModalOpen = false;
  isEditing = false;
  editingId: number | null = null;
  isEditMode = false;
  currentZoneId: number | null = null;

  private leaflet: any;
  private formChangesSubscription?: Subscription;

  @ViewChild('trackingMapContainer') trackingMapContainer!: ElementRef;
  @ViewChild('safeZonesMapContainer') safeZonesMapContainer!: ElementRef;
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  trackingMap: any;
  trackingMarker: any;
  trackingMapLayer: any = null;
  trackingClusterLayer: any = null;
  trackingPulse: any = null;
  trackingGuidanceLayer: any = null;

  setupMap: any = null;
  setupMapLayer: any = null;
  setupCurrentMarker: any = null;
  setupCurrentPulse: any = null;

  map: any = null;
  marker: any = null;
  radiusPreview: any = null;

  watchId: number | null = null;

  currentLat = 0;
  currentLng = 0;
  hasLocationSnapshot = false;
  currentAccuracyMeters: number | null = null;
  isResolvingLocation = false;

  movementStatus = 'Tracking';
  riskLevel = 'Low';
  isInSafeZone = true;
  currentStatus: TrackingStatus = 'SAFE';
  latestBackendPing: TrackingPingDto | null = null;
  lastStatusAlert: TrackingStatus | null = null;

  lastPosition: any = null;
  idleCounter = 0;
  private lastBrowserLocationCapturedAt = 0;
  private precisionWatchId: number | null = null;
  private precisionTimer: any = null;
  private readonly preferredAccuracyMeters = 35;
  private readonly acceptableAccuracyMeters = 120;
  private readonly precisionTimeoutMs = 15000;
  private lastBackendPingSentAt = 0;
  private backendPingMutedUntil = 0;
  private lastBackendPingLat: number | null = null;
  private lastBackendPingLng: number | null = null;
  private readonly backendPingMinIntervalMs = 12000;

  lastZoneStatus: 'INSIDE' | 'OUTSIDE' | null = null;
  guidanceMessage = '';
  guidanceDistanceMeters: number | null = null;
  guidanceZoneLabel = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
    private readonly trackingDashboardService: TrackingDashboardService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {
    this.form = this.fb.group({
      label: ['', Validators.required],
      addressText: [''],
      lat: [36.8065],
      lng: [10.1815],
      radius: [350, Validators.required]
    });

    this.formChangesSubscription = this.form.valueChanges.subscribe(() => {
      this.syncModalPreviewToForm();
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ensureMapStyles();
    this.user = JSON.parse(localStorage.getItem('current_user') || '{}');
    this.patientId = this.user?.userId || 'default';

    this.places = JSON.parse(localStorage.getItem(`places_${this.patientId}`) || '[]');
    this.alerts = JSON.parse(localStorage.getItem(`alerts_${this.patientId}`) || '[]');
    this.history = JSON.parse(localStorage.getItem(`history_${this.patientId}`) || '[]');

    this.loadPlacesFromBackend();
    this.loadPatientStatusFromBackend();
    this.loadCurrentLocationSnapshot(true);
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => this.initializeSetupMap(true), 150);
  }

  ngOnDestroy() {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    this.stopPrecisionCapture();

    this.formChangesSubscription?.unsubscribe();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    if (this.setupMap) {
      this.setupMap.remove();
      this.setupMap = null;
    }

    if (this.trackingMap) {
      this.trackingMap.remove();
      this.trackingMap = null;
    }
  }

  loadPlacesFromBackend() {
    this.http
      .get<any[]>(`http://localhost:8089/tracking/saved-places/patient/${this.patientId}`)
      .subscribe({
        next: (backendPlaces) => {
          this.places = backendPlaces || [];
          localStorage.setItem(`places_${this.patientId}`, JSON.stringify(this.places));
          this.refreshSetupMapLayers(true);
          this.refreshTrackingMapLayers();
        },
        error: (e) => console.log('failed loading places', e)
      });
  }

  loadClusters() {
    this.http
      .get<TrackingCluster[]>(`http://localhost:8089/tracking/clusters/${this.patientId}`)
      .subscribe({
        next: (data) => {
          this.clusters = data || [];
          this.drawClusters(this.clusters);
        },
        error: (e) => console.log('failed loading clusters', e)
      });
  }

  drawClusters(clusters: TrackingCluster[]) {
    if (!this.trackingMap || !this.leaflet) return;

    if (!this.trackingClusterLayer) {
      this.trackingClusterLayer = this.leaflet.layerGroup().addTo(this.trackingMap);
    }

    this.trackingClusterLayer.clearLayers();

    clusters.forEach((cluster) => {
      if (typeof cluster?.lat !== 'number' || typeof cluster?.lng !== 'number') {
        return;
      }

      const circle = this.leaflet.circle([cluster.lat, cluster.lng], {
        radius: 50,
        color: 'purple',
        fillColor: '#a855f7',
        fillOpacity: 0.3
      });

      circle.bindPopup('Frequent Location (AI)');
      circle.addTo(this.trackingClusterLayer);
    });
  }

  getStatus(ping: Partial<TrackingPingDto> | null | undefined = this.latestBackendPing): TrackingStatus {
    return this.trackingDashboardService.getStatus(ping);
  }

  loadPatientStatusFromBackend() {
    this.trackingDashboardService.getPatientStatus(this.patientId).subscribe({
      next: (patientStatus) => {
        if (!patientStatus) return;
        this.applyBackendStatus(patientStatus);
      },
      error: (e) => console.log('failed loading patient status', e)
    });
  }

  applyBackendStatus(ping: TrackingPingDto | null | undefined) {
    if (!ping) return;

    const previousStatus = this.currentStatus;

    this.latestBackendPing = ping;
    this.currentStatus = this.getStatus(ping);
    this.isInSafeZone = this.currentStatus === 'SAFE';
    this.riskLevel = this.currentStatus;

    if (
      typeof ping.lat === 'number' &&
      typeof ping.lng === 'number' &&
      this.shouldUseBackendCoordinates(ping)
    ) {
      this.currentLat = ping.lat;
      this.currentLng = ping.lng;
      this.hasLocationSnapshot = true;
    }

    if (this.history.length > 0) {
      this.history[0] = {
        ...this.history[0],
        status: this.currentStatus
      };
      localStorage.setItem(`history_${this.patientId}`, JSON.stringify(this.history));
    }

    this.syncStatusAlert(previousStatus, this.currentStatus, ping);
    this.refreshSetupMapLayers();
    this.refreshTrackingMapLayers();
    this.updateGuidance();
    this.persistLocalTrackingSnapshot();
  }

  syncStatusAlert(previousStatus: TrackingStatus, nextStatus: TrackingStatus, ping: TrackingPingDto) {
    if (nextStatus === 'SAFE') {
      this.lastStatusAlert = null;
      return;
    }

    if (previousStatus === nextStatus || this.lastStatusAlert === nextStatus) {
      return;
    }

    this.lastStatusAlert = nextStatus;
    this.triggerAlert(
      this.getStatusAlertMessage(nextStatus, ping),
      this.getStatusAlertSeverity(nextStatus, ping)
    );
  }

  getStatusAlertMessage(status: TrackingStatus, ping: TrackingPingDto) {
    if (!ping.insideSafeZone) {
      return 'Patient left safe zone - immediate attention required';
    }

    if (status === 'DANGER') {
      return 'High abnormal activity detected';
    }

    return 'Slight irregular activity detected';
  }

  getStatusAlertSeverity(status: TrackingStatus, ping: TrackingPingDto) {
    if (!ping.insideSafeZone) return 'CRITICAL';
    if (status === 'DANGER') return 'HIGH';
    if (status === 'WARNING') return 'MEDIUM';
    return 'LOW';
  }

  openAdd() {
    const lat = this.hasLocationSnapshot ? this.currentLat : 36.8;
    const lng = this.hasLocationSnapshot ? this.currentLng : 10.18;

    this.isModalOpen = true;
    this.isEditing = false;
    this.editingId = null;
    this.isEditMode = false;
    this.currentZoneId = null;
    this.form.reset({
      label: '',
      addressText: '',
      lat,
      lng,
      radius: 350
    });

    setTimeout(() => this.loadModalMap(), 300);
  }

  openEdit(p: any) {
    this.editZone(p);
  }

  editZone(zone: any) {
    this.isModalOpen = true;
    this.isEditing = true;
    this.editingId = zone.id;
    this.isEditMode = true;
    this.currentZoneId = zone.id;
    this.form.patchValue({
      ...zone,
      radius: this.getPlaceRadius(zone)
    });

    setTimeout(() => this.loadModalMap(), 300);
  }

  openAddFromMap(lat: number, lng: number) {
    this.openAdd();
    this.form.patchValue({ lat, lng });
    this.showTransientToast('Location selected from map. Confirm the radius and save.');
  }

  openAddWithCurrentLocation() {
    this.openAdd();
    this.form.patchValue({ label: 'Current Location' });

    if (this.hasLocationSnapshot) {
      this.form.patchValue({ lat: this.currentLat, lng: this.currentLng });
      setTimeout(() => this.syncModalPreviewToForm(true), 350);
      return;
    }

    this.useMyLocation();
  }

  closeModal() {
    this.isModalOpen = false;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.marker = null;
    this.radiusPreview = null;
    this.resetForm();
  }

  save() {
    const formValue = this.form.value;

    const placeToSave = {
      ...formValue,
      radius: formValue.radius || 350,
      patientId: this.patientId
    };

    if (this.isEditMode && this.currentZoneId !== null) {
      const index = this.places.findIndex((p) => p.id === this.currentZoneId);
      if (index !== -1) this.places[index] = { ...placeToSave, id: this.currentZoneId };
    } else {
      this.places.push({ ...placeToSave, id: Date.now() });
    }

    localStorage.setItem(`places_${this.patientId}`, JSON.stringify(this.places));
    this.refreshSetupMapLayers(true);
    this.refreshTrackingMapLayers();

    if (this.isEditMode && this.currentZoneId !== null) {
      this.http.put(`http://localhost:8089/tracking/saved-places/${this.currentZoneId}`, placeToSave)
        .pipe(tap(() => this.loadPlacesFromBackend()))
        .subscribe({
          next: () => console.log('updated in backend'),
          error: (e) => console.log('backend error', e)
        });
    } else {
      this.http.post('http://localhost:8089/tracking/saved-places', placeToSave)
        .pipe(tap(() => this.loadPlacesFromBackend()))
        .subscribe({
          next: () => console.log('saved to backend'),
          error: (e) => console.log('backend error', e)
        });
    }

    this.showTransientToast(this.isEditMode ? 'Safe zone updated.' : 'Safe zone added.');
    this.closeModal();
  }

  sendCurrentLocation() {
    this.requestPreciseLocation(
      {
        centerSetupMap: this.mode === 'setup',
        centerTrackingMap: this.mode === 'tracking',
        persistToBackend: true
      },
      'Could not capture your current location.'
    );
  }

  remove(id: number) {
    this.places = this.places.filter((p) => p.id !== id);
    localStorage.setItem(`places_${this.patientId}`, JSON.stringify(this.places));
    this.refreshSetupMapLayers(true);

    this.http.delete(`http://localhost:8089/tracking/saved-places/${id}`).subscribe({
      next: () => {
        console.log('deleted from backend');
        this.loadPlacesFromBackend();
        this.sendCurrentLocation();
      },
      error: (e) => console.log('delete error', e)
    });

    this.showTransientToast('Safe zone removed.');
  }

  startTrackingMode() {
    this.mode = 'tracking';

    if (this.setupMap) {
      this.setupMap.remove();
      this.setupMap = null;
      this.setupMapLayer = null;
    }

    setTimeout(() => {
      this.loadTrackingMap();
      this.sendCurrentLocation();
      this.startTracking();
      this.loadClusters();
    }, 300);
  }

  goBackToSetup() {
    this.mode = 'setup';

    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    setTimeout(() => this.initializeSetupMap(true), 300);
  }

  startTracking() {
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!this.shouldAcceptLiveFix(pos.coords.accuracy)) {
          return;
        }

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        this.applyBrowserLocation(lat, lng, {
          accuracyMeters: pos.coords.accuracy,
          centerTrackingMap: true,
          persistToBackend: true
        });
        this.checkSafeZone(lat, lng);
        this.detectIdle(lat, lng);

        this.history.unshift({
          time: new Date().toLocaleTimeString(),
          date: new Date().toLocaleDateString(),
          timestamp: new Date().toISOString(),
          lat,
          lng,
          status: this.currentStatus
        });

        localStorage.setItem(`history_${this.patientId}`, JSON.stringify(this.history));
      },
      (error) => console.log('watch position failed', error),
      this.getGeoOptions()
    );
  }

  triggerAlert(msg: string, severity: string = 'HIGH') {
    const now = new Date();

    const alertData = {
      text: msg,
      time: now.toLocaleTimeString(),
      date: now.toLocaleDateString(),
      patientId: this.patientId,
      message: msg,
      severity,
      timestamp: now.toISOString()
    };

    this.alerts.unshift(alertData);
    this.alerts = this.alerts.slice(0, 20);

    localStorage.setItem(`alerts_${this.patientId}`, JSON.stringify(this.alerts));
    this.showTransientToast(msg);

    this.http.post(
      'http://localhost:8089/tracking/alerts',
      alertData
    ).subscribe({
      next: () => console.log('alert sent'),
      error: (e) => console.log('alert error', e)
    });
  }

  checkSafeZone(lat: number, lng: number) {
    let inside = false;

    for (const p of this.places) {
      const d = this.getDistance(lat, lng, Number(p.lat), Number(p.lng));
      const radius = this.getPlaceRadius(p);
      if (d <= radius) inside = true;
    }

    if (this.lastZoneStatus === null) {
      this.lastZoneStatus = inside ? 'INSIDE' : 'OUTSIDE';
    } else {
      if (!inside && this.lastZoneStatus === 'INSIDE') {
        this.triggerAlert('Patient left safe zone');
        this.lastStatusAlert = 'DANGER';
        this.lastZoneStatus = 'OUTSIDE';
      }

      if (inside && this.lastZoneStatus === 'OUTSIDE') {
        this.triggerAlert('Patient returned to safe zone');
        this.lastStatusAlert = null;
        this.lastZoneStatus = 'INSIDE';
      }
    }

    this.isInSafeZone = inside;
    this.riskLevel = inside ? 'Low' : 'High';
    this.refreshSetupMapLayers();
    this.updateGuidance();
    this.persistLocalTrackingSnapshot();

    if (this.latestBackendPing) {
      this.applyBackendStatus(this.latestBackendPing);
    }
  }

  detectIdle(lat: number, lng: number) {
    if (!this.lastPosition) {
      this.lastPosition = { lat, lng };
      this.movementStatus = 'Tracking';
      return;
    }

    const d = this.getDistance(
      this.lastPosition.lat,
      this.lastPosition.lng,
      lat,
      lng
    );

    if (d < 3) {
      this.idleCounter++;
      this.movementStatus = 'Stable';
      if (this.idleCounter > 10) {
        this.triggerAlert('Patient idle too long');
      }
    } else {
      this.idleCounter = 0;
      this.lastPosition = { lat, lng };
      this.movementStatus = 'Moving';
    }
  }

  async loadTrackingMap() {
    const leafletLib = await this.ensureLeaflet();

    if (!this.trackingMapContainer?.nativeElement) return;

    if (this.trackingMap) {
      this.trackingMap.remove();
      this.trackingMap = null;
    }

    this.trackingMapLayer = null;
    this.trackingClusterLayer = null;
    this.trackingMarker = null;
    this.trackingPulse = null;

    const lat = this.currentLat || 36.8;
    const lng = this.currentLng || 10.18;

    this.trackingMap = leafletLib.map(this.trackingMapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: false
    }).setView([lat, lng], 14);

    leafletLib.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.trackingMap);

    this.trackingMapLayer = leafletLib.layerGroup().addTo(this.trackingMap);
    this.refreshTrackingMapLayers(true);
    this.drawClusters(this.clusters);

    setTimeout(() => this.trackingMap.invalidateSize(), 100);
  }

  updateTrackingMap(lat: number, lng: number) {
    if (!this.trackingMap) return;

    this.refreshTrackingMapLayers(true);
    this.updateGuidance();
  }

  async loadModalMap() {
    const leafletLib = await this.ensureLeaflet();

    if (!this.mapContainer?.nativeElement) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const lat = Number(this.form.value.lat) || this.currentLat || 36.8;
    const lng = Number(this.form.value.lng) || this.currentLng || 10.18;

    this.map = leafletLib.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: false
    }).setView([lat, lng], 14);

    leafletLib.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.marker = leafletLib.circleMarker([lat, lng], {
      radius: 8,
      color: '#5b21b6',
      fillColor: '#7c3aed',
      fillOpacity: 1,
      weight: 3
    }).addTo(this.map);

    this.radiusPreview = leafletLib.circle([lat, lng], {
      radius: Number(this.form.value.radius) || 350,
      color: '#7c3aed',
      fillColor: '#a78bfa',
      fillOpacity: 0.18,
      weight: 2
    }).addTo(this.map);

    this.map.on('click', (event: any) => {
      const { lat: selectedLat, lng: selectedLng } = event.latlng;
      this.form.patchValue({ lat: selectedLat, lng: selectedLng });
      this.syncModalPreviewToForm(true);
    });

    setTimeout(() => this.map.invalidateSize(), 200);
  }

  useMyLocation() {
    this.requestPreciseLocation(
      {
        centerSetupMap: true,
        centerModalMap: true,
        persistToBackend: true,
        toastMessage: 'Current location loaded.'
      },
      'Could not access your current location.'
    );
  }

  handleAssistantAction(action: AssistantAction) {
    if (action === 'use-current-location') {
      this.useMyLocation();
      return;
    }

    if (action === 'save-current-location') {
      this.openAddWithCurrentLocation();
      return;
    }

    if (action === 'lost') {
      this.updateGuidance(true, 'Follow the path to reach your safe zone');
      return;
    }

    this.openAdd();
  }

  handleLostClick() {
    this.updateGuidance(true, 'Follow the path to reach your safe zone');
  }

  getPlaceTitle(place: any, index: number) {
    if (place?.label) return place.label;
    return index === 0 ? 'Home' : `Safe Zone ${index + 1}`;
  }

  getPlaceRadius(place: any) {
    return Number(place?.radius) || 350;
  }

  getPlaceState(place: any): 'INSIDE' | 'OUTSIDE' {
    if (!this.hasLocationSnapshot) return 'OUTSIDE';

    const distance = this.getDistance(
      this.currentLat,
      this.currentLng,
      Number(place.lat),
      Number(place.lng)
    );

    return distance <= this.getPlaceRadius(place) ? 'INSIDE' : 'OUTSIDE';
  }

  getPlaceStateClass(place: any) {
    return this.getPlaceState(place).toLowerCase();
  }

  getInsidePlacesCount() {
    return this.places.filter((place) => this.getPlaceState(place) === 'INSIDE').length;
  }

  formatCoordinate(value: number) {
    return Number(value || 0).toFixed(4);
  }

  getAlertText(alert: any) {
    return alert?.message || alert?.text || 'Alert';
  }

  getAlertSeverityClass(alert: any) {
    const severity = (alert?.severity || 'medium').toString().toLowerCase();

    if (severity === 'critical' || severity === 'high') return 'danger';
    if (severity === 'medium' || severity === 'warning') return 'warning';
    return 'safe';
  }

  getHistoryStatusClass(status: string) {
    const normalized = (status || '').toUpperCase();

    if (normalized === 'DANGER' || normalized === 'OUTSIDE') return 'danger';
    if (normalized === 'WARNING') return 'warning';
    return 'safe';
  }

  getLiveSummaryText() {
    if (!this.hasLocationSnapshot) {
      return 'Waiting for live location to start safe zone guidance.';
    }

    if (this.lastZoneStatus === 'OUTSIDE') {
      return 'Current location is outside the saved safe zones.';
    }

    if (this.currentStatus === 'WARNING') {
      return 'Current location is near a threshold. Continue observing movement.';
    }

    return 'Current position is available for quick safe zone setup and live monitoring.';
  }

  getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
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

  resetForm() {
    const lat = this.hasLocationSnapshot ? this.currentLat : 36.8;
    const lng = this.hasLocationSnapshot ? this.currentLng : 10.18;

    this.isEditing = false;
    this.editingId = null;
    this.isEditMode = false;
    this.currentZoneId = null;
    this.form.reset({
      label: '',
      addressText: '',
      lat,
      lng,
      radius: 350
    });
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

  private loadCurrentLocationSnapshot(centerMap = false) {
    if (!navigator.geolocation) return;

    this.requestPreciseLocation(
      {
        centerSetupMap: centerMap,
        persistToBackend: true,
        silent: true
      },
      'Could not get a precise location snapshot.'
    );
  }

  private async initializeSetupMap(centerOnData = false) {
    if (!this.safeZonesMapContainer?.nativeElement) return;

    const leafletLib = await this.ensureLeaflet();

    if (this.setupMap) {
      this.setupMap.remove();
      this.setupMap = null;
    }

    const center = this.hasLocationSnapshot
      ? [this.currentLat, this.currentLng]
      : [36.8065, 10.1815];

    this.setupMap = leafletLib.map(this.safeZonesMapContainer.nativeElement, {
      zoomControl: false,
      attributionControl: false
    }).setView(center, 13);

    leafletLib.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.setupMap);

    leafletLib.control.zoom({ position: 'bottomright' }).addTo(this.setupMap);

    this.setupMapLayer = leafletLib.layerGroup().addTo(this.setupMap);

    this.setupMap.on('click', (event: any) => {
      this.openAddFromMap(event.latlng.lat, event.latlng.lng);
    });

    setTimeout(() => this.setupMap.invalidateSize(), 200);
    this.refreshSetupMapLayers(centerOnData);
  }

  private updateGuidance(force = false, messageOverride?: string) {
    if (!this.trackingMap || !this.leaflet) return;

    if (this.isInSafeZone && !force) {
      this.clearGuidance();
      return;
    }

    if (!this.hasLocationSnapshot || this.places.length === 0) {
      this.clearGuidance();
      return;
    }

    const nearest = this.findNearestSafeZone();
    if (!nearest) {
      this.clearGuidance();
      return;
    }

    const { place, distance } = nearest;
    this.guidanceDistanceMeters = Math.round(distance);
    this.guidanceZoneLabel = this.getPlaceTitle(place, 0);
    this.guidanceMessage = messageOverride ||
      `You are ${this.guidanceDistanceMeters} meters away from your safe zone`;

    this.ensureGuidanceLayer();
    this.clearGuidanceLayer();

    const currentPoint: [number, number] = [this.currentLat, this.currentLng];
    const zonePoint: [number, number] = [Number(place.lat), Number(place.lng)];

    this.leaflet.polyline([currentPoint, zonePoint], {
      color: '#ef4444',
      weight: 4,
      opacity: 0.9,
      dashArray: '6 6'
    }).addTo(this.trackingGuidanceLayer);

    this.leaflet.circleMarker(zonePoint, {
      radius: 8,
      color: '#ef4444',
      fillColor: '#fee2e2',
      fillOpacity: 1,
      weight: 3
    }).addTo(this.trackingGuidanceLayer)
      .bindTooltip(this.guidanceZoneLabel, { direction: 'top', opacity: 0.95 });
  }

  private findNearestSafeZone() {
    if (!this.hasLocationSnapshot) return null;

    let nearest: any = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const place of this.places) {
      const dist = this.getDistance(
        this.currentLat,
        this.currentLng,
        Number(place.lat),
        Number(place.lng)
      );
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearest = place;
      }
    }

    if (!nearest) return null;
    return { place: nearest, distance: nearestDistance };
  }

  private ensureGuidanceLayer() {
    if (!this.trackingGuidanceLayer) {
      this.trackingGuidanceLayer = this.leaflet.layerGroup().addTo(this.trackingMap);
    }
  }

  private clearGuidanceLayer() {
    if (this.trackingGuidanceLayer) {
      this.trackingGuidanceLayer.clearLayers();
    }
  }

  private clearGuidance() {
    this.guidanceMessage = '';
    this.guidanceDistanceMeters = null;
    this.guidanceZoneLabel = '';
    this.clearGuidanceLayer();
  }

  private refreshTrackingMapLayers(centerOnPatient = false) {
    if (!this.trackingMap || !this.leaflet) return;

    if (!this.trackingMapLayer) {
      this.trackingMapLayer = this.leaflet.layerGroup().addTo(this.trackingMap);
    }

    this.ensureGuidanceLayer();

    this.trackingMapLayer.clearLayers();

    const bounds: Array<[number, number]> = [];

    if (this.hasLocationSnapshot) {
      this.trackingPulse = this.leaflet.circle([this.currentLat, this.currentLng], {
        radius: 120,
        color: '#93c5fd',
        fillColor: '#60a5fa',
        fillOpacity: 0.12,
        weight: 1
      }).addTo(this.trackingMapLayer);

      this.trackingMarker = this.leaflet.circleMarker([this.currentLat, this.currentLng], {
        radius: 9,
        color: '#1d4ed8',
        fillColor: '#2563eb',
        fillOpacity: 1,
        weight: 3
      }).addTo(this.trackingMapLayer);

      this.trackingMarker.bindTooltip('Current location', {
        direction: 'top',
        opacity: 0.95
      });

      bounds.push([this.currentLat, this.currentLng]);
    }

    this.places.forEach((place: any, index: number) => {
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      const radius = this.getPlaceRadius(place);
      const zoneState = this.getPlaceState(place);
      const circleColor = zoneState === 'INSIDE' ? '#059669' : '#10b981';

      this.leaflet.circle([lat, lng], {
        radius,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: zoneState === 'INSIDE' ? 0.16 : 0.1,
        weight: 2
      }).addTo(this.trackingMapLayer);

      const marker = this.leaflet.circleMarker([lat, lng], {
        radius: 7,
        color: circleColor,
        fillColor: '#ffffff',
        fillOpacity: 1,
        weight: 3
      }).addTo(this.trackingMapLayer);

      marker.bindPopup(`
        <strong>${this.getPlaceTitle(place, index)}</strong><br>
        Radius: ${radius}m
      `);

      bounds.push([lat, lng]);
    });

    if (centerOnPatient && this.hasLocationSnapshot) {
      this.trackingMap.setView([this.currentLat, this.currentLng], Math.max(this.trackingMap.getZoom(), 14));
    } else if (centerOnPatient && bounds.length > 1) {
      this.trackingMap.fitBounds(this.leaflet.latLngBounds(bounds), { padding: [36, 36] });
    }

    setTimeout(() => this.trackingMap?.invalidateSize(), 100);
  }

  private refreshSetupMapLayers(centerOnData = false) {
    if (!this.setupMap || !this.leaflet) return;

    if (!this.setupMapLayer) {
      this.setupMapLayer = this.leaflet.layerGroup().addTo(this.setupMap);
    }

    this.setupMapLayer.clearLayers();

    const bounds: Array<[number, number]> = [];

    if (this.hasLocationSnapshot) {
      this.setupCurrentPulse = this.leaflet.circle([this.currentLat, this.currentLng], {
        radius: 120,
        color: '#93c5fd',
        fillColor: '#60a5fa',
        fillOpacity: 0.12,
        weight: 1
      }).addTo(this.setupMapLayer);

      this.setupCurrentMarker = this.leaflet.circleMarker([this.currentLat, this.currentLng], {
        radius: 9,
        color: '#1d4ed8',
        fillColor: '#2563eb',
        fillOpacity: 1,
        weight: 3
      }).addTo(this.setupMapLayer);

      this.setupCurrentMarker.bindTooltip('Current location', {
        direction: 'top',
        opacity: 0.95
      });

      bounds.push([this.currentLat, this.currentLng]);
    }

    this.places.forEach((place: any, index: number) => {
      const lat = Number(place.lat);
      const lng = Number(place.lng);
      const radius = this.getPlaceRadius(place);
      const zoneState = this.getPlaceState(place);
      const circleColor = zoneState === 'INSIDE' ? '#059669' : '#7c3aed';

      this.leaflet.circle([lat, lng], {
        radius,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: zoneState === 'INSIDE' ? 0.16 : 0.1,
        weight: 2
      }).addTo(this.setupMapLayer);

      const marker = this.leaflet.circleMarker([lat, lng], {
        radius: 7,
        color: circleColor,
        fillColor: '#ffffff',
        fillOpacity: 1,
        weight: 3
      }).addTo(this.setupMapLayer);

      marker.bindPopup(`
        <strong>${this.getPlaceTitle(place, index)}</strong><br>
        Radius: ${radius}m
      `);

      bounds.push([lat, lng]);
    });

    if (!centerOnData) return;

    if (bounds.length > 1) {
      this.setupMap.fitBounds(this.leaflet.latLngBounds(bounds), { padding: [36, 36] });
      return;
    }

    if (bounds.length === 1) {
      this.setupMap.setView(bounds[0], 14);
      return;
    }

    this.setupMap.setView([36.8065, 10.1815], 13);
  }

  private syncModalPreviewToForm(centerMap = false) {
    if (!this.map || !this.marker || !this.radiusPreview) return;

    const lat = Number(this.form.value.lat) || this.currentLat || 36.8;
    const lng = Number(this.form.value.lng) || this.currentLng || 10.18;
    const radius = Number(this.form.value.radius) || 350;

    this.marker.setLatLng([lat, lng]);
    this.radiusPreview.setLatLng([lat, lng]);
    this.radiusPreview.setRadius(radius);

    if (centerMap) {
      this.map.setView([lat, lng], Math.max(this.map.getZoom(), 14));
    }
  }

  private applyBrowserLocation(
    lat: number,
    lng: number,
    options: {
      accuracyMeters?: number;
      centerSetupMap?: boolean;
      centerTrackingMap?: boolean;
      centerModalMap?: boolean;
      persistToBackend?: boolean;
      toastMessage?: string;
      silent?: boolean;
    } = {}
  ) {
    this.currentLat = lat;
    this.currentLng = lng;
    this.hasLocationSnapshot = true;
    this.lastBrowserLocationCapturedAt = Date.now();
    this.currentAccuracyMeters = this.normalizeAccuracy(options.accuracyMeters);

    if (this.latestBackendPing) {
      this.latestBackendPing = {
        ...this.latestBackendPing,
        lat,
        lng
      };
    }

    this.refreshSetupMapLayers();

    if (options.centerSetupMap && this.setupMap) {
      this.setupMap.setView([lat, lng], Math.max(this.setupMap.getZoom(), 15));
    }

    if (this.trackingMap) {
      this.refreshTrackingMapLayers(!!options.centerTrackingMap);
    }

    if (this.map) {
      this.syncModalPreviewToForm(!!options.centerModalMap);
    }

    if (options.persistToBackend) {
      this.pushCurrentLocationPing(lat, lng);
    }

    this.persistLocalTrackingSnapshot();

    if (options.toastMessage && !options.silent) {
      this.showTransientToast(options.toastMessage);
    }
  }

  private pushCurrentLocationPing(lat: number, lng: number) {
    if (!this.shouldPushBackendPing(lat, lng)) {
      return;
    }

    this.lastBackendPingSentAt = Date.now();
    this.lastBackendPingLat = lat;
    this.lastBackendPingLng = lng;

    this.http.post('http://localhost:8089/tracking/location-pings', {
      patientId: this.patientId,
      lat,
      lng
    }).subscribe({
      next: () => {
        this.backendPingMutedUntil = 0;
        console.log('sent current location to backend');
        this.loadPatientStatusFromBackend();
        this.loadClusters();
      },
      error: (e) => {
        console.log('send failed', e);
        this.backendPingMutedUntil = Date.now() + 30000;
      }
    });
  }

  private shouldUseBackendCoordinates(ping: TrackingPingDto) {
    if (!this.hasLocationSnapshot) return true;

    const backendTimestamp = ping.timestamp ? new Date(ping.timestamp).getTime() : 0;
    if (!backendTimestamp) return this.lastBrowserLocationCapturedAt === 0;

    return backendTimestamp >= this.lastBrowserLocationCapturedAt;
  }

  private requestPreciseLocation(options: BrowserLocationOptions, failureMessage: string) {
    if (!navigator.geolocation) {
      if (!options.silent) {
        this.showTransientToast('Geolocation is not supported on this device.');
      }
      return;
    }

    this.stopPrecisionCapture();
    this.isResolvingLocation = true;

    let bestPosition: GeolocationPosition | null = null;

    const finalize = (position?: GeolocationPosition | null) => {
      const finalPosition = position || bestPosition;
      const accuracy = this.normalizeAccuracy(finalPosition?.coords.accuracy);
      const shouldWarnWeakAccuracy = accuracy !== null && accuracy > this.acceptableAccuracyMeters;
      const toastMessage = shouldWarnWeakAccuracy
        ? `Location is approximate (${Math.round(accuracy)}m). Turn on device location for a better fix.`
        : options.toastMessage;

      this.stopPrecisionCapture();
      this.isResolvingLocation = false;

      if (!finalPosition) {
        if (!options.silent) {
          this.showTransientToast(failureMessage);
        }
        return;
      }

      this.form.patchValue(
        {
          lat: finalPosition.coords.latitude,
          lng: finalPosition.coords.longitude
        },
        { emitEvent: !!this.isModalOpen }
      );

      this.applyBrowserLocation(finalPosition.coords.latitude, finalPosition.coords.longitude, {
        ...options,
        accuracyMeters: finalPosition.coords.accuracy,
        toastMessage
      });
    };

    this.precisionWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = this.normalizeAccuracy(position.coords.accuracy) ?? Number.POSITIVE_INFINITY;
        const bestAccuracy = this.normalizeAccuracy(bestPosition?.coords.accuracy) ?? Number.POSITIVE_INFINITY;

        if (!bestPosition || accuracy < bestAccuracy) {
          bestPosition = position;

          if (this.isModalOpen) {
            this.form.patchValue(
              {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              },
              { emitEvent: true }
            );
          }

          this.applyBrowserLocation(position.coords.latitude, position.coords.longitude, {
            ...options,
            accuracyMeters: position.coords.accuracy,
            persistToBackend: false,
            toastMessage: undefined,
            silent: true
          });
        }

        if (accuracy <= this.preferredAccuracyMeters) {
          finalize(position);
        }
      },
      (error) => {
        console.log('precise location capture failed', error);
        finalize(bestPosition);
      },
      this.getGeoOptions()
    );

    this.precisionTimer = setTimeout(() => finalize(bestPosition), this.precisionTimeoutMs);
  }

  private stopPrecisionCapture() {
    if (this.precisionWatchId !== null) {
      navigator.geolocation.clearWatch(this.precisionWatchId);
      this.precisionWatchId = null;
    }

    if (this.precisionTimer) {
      clearTimeout(this.precisionTimer);
      this.precisionTimer = null;
    }
  }

  private shouldAcceptLiveFix(accuracy?: number | null) {
    const normalizedAccuracy = this.normalizeAccuracy(accuracy);

    if (normalizedAccuracy === null) {
      return true;
    }

    if (this.currentAccuracyMeters === null) {
      return true;
    }

    if (normalizedAccuracy <= this.acceptableAccuracyMeters) {
      return true;
    }

    return normalizedAccuracy < this.currentAccuracyMeters;
  }

  private shouldPushBackendPing(lat: number, lng: number) {
    const now = Date.now();

    if (now < this.backendPingMutedUntil) {
      return false;
    }

    if (this.lastBackendPingSentAt === 0) {
      return true;
    }

    if (
      this.lastBackendPingLat === null ||
      this.lastBackendPingLng === null
    ) {
      return true;
    }

    const movedDistance = this.getDistance(
      this.lastBackendPingLat,
      this.lastBackendPingLng,
      lat,
      lng
    );

    if (movedDistance >= 8) {
      return true;
    }

    return now - this.lastBackendPingSentAt >= this.backendPingMinIntervalMs;
  }

  private normalizeAccuracy(value?: number | null) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private persistLocalTrackingSnapshot() {
    if (typeof localStorage === 'undefined' || !this.patientId || !this.hasLocationSnapshot) {
      return;
    }

    const riskScore =
      this.currentStatus === 'DANGER' ? 80 :
      this.currentStatus === 'WARNING' ? 35 :
      0;

    localStorage.setItem(
      `tracking_live_position_${this.patientId}`,
      JSON.stringify({
        patientId: this.patientId,
        lat: this.currentLat,
        lng: this.currentLng,
        timestamp: new Date(this.lastBrowserLocationCapturedAt || Date.now()).toISOString(),
        insideSafeZone: this.isInSafeZone,
        riskScore,
        speed: this.latestBackendPing?.speed ?? null,
        trend: this.currentStatus,
        accuracyMeters: this.currentAccuracyMeters,
        source: 'browser'
      })
    );
  }

  getAccuracyLabel() {
    if (this.isResolvingLocation) {
      return 'Finding precise GPS...';
    }

    if (this.currentAccuracyMeters === null) {
      return 'Waiting for GPS';
    }

    const rounded = Math.round(this.currentAccuracyMeters);
    if (rounded <= this.preferredAccuracyMeters) {
      return `Precise (${rounded}m)`;
    }

    if (rounded <= this.acceptableAccuracyMeters) {
      return `Good (${rounded}m)`;
    }

    return `Approximate (${rounded}m)`;
  }

  private getGeoOptions(): PositionOptions {
    return {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    };
  }

  private showTransientToast(message: string) {
    this.toastMessage = message;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 2400);
  }
}
