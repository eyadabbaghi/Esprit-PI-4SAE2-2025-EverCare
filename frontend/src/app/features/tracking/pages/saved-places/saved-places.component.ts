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

  movementStatus = 'Tracking';
  riskLevel = 'Low';
  isInSafeZone = true;
  currentStatus: TrackingStatus = 'SAFE';
  latestBackendPing: TrackingPingDto | null = null;
  lastStatusAlert: TrackingStatus | null = null;

  lastPosition: any = null;
  idleCounter = 0;

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

    if (typeof ping.lat === 'number' && typeof ping.lng === 'number') {
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
    navigator.geolocation.getCurrentPosition((pos) => {
      const payload = {
        patientId: this.patientId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      this.currentLat = payload.lat;
      this.currentLng = payload.lng;
      this.hasLocationSnapshot = true;
      this.refreshSetupMapLayers();

      this.http.post(
        'http://localhost:8089/tracking/location-pings',
        payload
      ).subscribe(() => {
        console.log('forced refresh ping');
        this.loadPatientStatusFromBackend();
      });
    });
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
      this.startTracking();
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
    this.watchId = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      this.currentLat = lat;
      this.currentLng = lng;
      this.hasLocationSnapshot = true;

      this.updateTrackingMap(lat, lng);
      this.checkSafeZone(lat, lng);
      this.detectIdle(lat, lng);

      const payload = {
        patientId: this.patientId,
        lat,
        lng
      };

      this.http.post(
        'http://localhost:8089/tracking/location-pings',
        payload
      ).subscribe({
        next: () => {
          console.log('sent to backend');
          this.loadPatientStatusFromBackend();
        },
        error: (e) => console.log('send failed', e)
      });

      this.history.unshift({
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        lat,
        lng,
        status: this.currentStatus
      });

      localStorage.setItem(`history_${this.patientId}`, JSON.stringify(this.history));
    });
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
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      this.currentLat = lat;
      this.currentLng = lng;
      this.hasLocationSnapshot = true;
      this.form.patchValue({ lat, lng });

      this.syncModalPreviewToForm(true);
      this.refreshSetupMapLayers(true);
      this.showTransientToast('Current location loaded.');
    });
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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentLat = pos.coords.latitude;
        this.currentLng = pos.coords.longitude;
        this.hasLocationSnapshot = true;
        this.refreshSetupMapLayers(centerMap);
      },
      (error) => console.log('failed getting location snapshot', error),
      { enableHighAccuracy: true, timeout: 10000 }
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
        color: '#c4b5fd',
        fillColor: '#a78bfa',
        fillOpacity: 0.08,
        weight: 1
      }).addTo(this.trackingMapLayer);

      this.trackingMarker = this.leaflet.circleMarker([this.currentLat, this.currentLng], {
        radius: 9,
        color: '#4c1d95',
        fillColor: '#7c3aed',
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
      const circleColor = zoneState === 'INSIDE' ? '#059669' : '#7c3aed';

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
        color: '#c4b5fd',
        fillColor: '#a78bfa',
        fillOpacity: 0.08,
        weight: 1
      }).addTo(this.setupMapLayer);

      this.setupCurrentMarker = this.leaflet.circleMarker([this.currentLat, this.currentLng], {
        radius: 9,
        color: '#4c1d95',
        fillColor: '#7c3aed',
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

  private showTransientToast(message: string) {
    this.toastMessage = message;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 2400);
  }
}
