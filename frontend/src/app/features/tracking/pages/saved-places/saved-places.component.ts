import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Inject,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import { SavedPlaceService } from '../../services/saved-place.service';
import { SavedPlace } from '../../models/saved-place.model';

@Component({
  selector: 'app-saved-places',
  templateUrl: './saved-places.component.html',
  styleUrls: ['./saved-places.component.css'],
})
export class SavedPlacesComponent implements OnInit, AfterViewInit {
  places: SavedPlace[] = [];

  // TODO: replace with logged in patient id
  patientId = '12';

  // modal state
  isModalOpen = false;
  isEditing = false;
  editingId: number | null = null;

  // form
  form: FormGroup;

  // ORS key
  private ORS_KEY =
    'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJhNmVhZGMxYzQyMjQ3ZDI5Nzc2YTRmN2Q5MjY1NDdjIiwiaCI6Im11cm11cjY0In0=';

  // SSR
  isBrowser = false;

  // Leaflet refs (SSR-safe dynamic import)
  private L: any;
  private map: any;
  private marker: any;

  // map container in modal
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  // GPS UX
  isLocating = false;
  locateError = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private service: SavedPlaceService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.form = this.fb.group({
      label: ['', [Validators.required, Validators.minLength(2)]],
      addressText: ['', [Validators.required, Validators.minLength(3)]],
      lat: [36.8065, [Validators.required]],
      lng: [10.1815, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    this.L = await import('leaflet');

    // fix marker icons
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });
  }

  // ----------------- CRUD -----------------

  load(): void {
    this.service.getByPatient(this.patientId).subscribe({
      next: (data) => (this.places = data),
      error: (err) => console.error('LOAD ERROR', err),
    });
  }

  openAdd(): void {
    this.isModalOpen = true;
    this.isEditing = false;
    this.editingId = null;

    // reset form to Tunis
    this.form.reset({
      label: '',
      addressText: '',
      lat: 36.8065,
      lng: 10.1815,
    });

    setTimeout(() => this.initMapOrReset(), 0);
  }

  openEdit(p: SavedPlace): void {
    this.isModalOpen = true;
    this.isEditing = true;
    this.editingId = p.id ?? null;

    this.form.reset({
      label: p.label,
      addressText: p.addressText,
      lat: p.lat,
      lng: p.lng,
    });

    setTimeout(() => this.initMapOrReset(), 0);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.editingId = null;
    this.locateError = '';
    this.isLocating = false;

    // destroy map to avoid glitches next open
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
    }
  }

  save(): void {
    if (this.form.invalid) return;

    const payload: SavedPlace = {
      patientId: this.patientId,
      label: this.form.value.label,
      addressText: this.form.value.addressText,
      lat: Number(this.form.value.lat),
      lng: Number(this.form.value.lng),
    };

    if (this.isEditing && this.editingId != null) {
      this.service.update(this.editingId, payload).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err) => console.error('UPDATE ERROR', err),
      });
    } else {
      this.service.add(payload).subscribe({
        next: () => {
          this.closeModal();
          this.load();
        },
        error: (err) => console.error('ADD ERROR', err),
      });
    }
  }

  remove(id?: number): void {
    if (!id) return;
    this.service.delete(id).subscribe({
      next: () => this.load(),
      error: (err) => console.error('DELETE ERROR', err),
    });
  }

  // ----------------- MAP -----------------

  private initMapOrReset(): void {
    if (!this.isBrowser) return;
    if (!this.L) return;
    if (!this.mapContainer?.nativeElement) return;

    const lat = Number(this.form.value.lat);
    const lng = Number(this.form.value.lng);

    // Create map
    this.map = this.L.map(this.mapContainer.nativeElement).setView([lat, lng], 13);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 4,
    }).addTo(this.map);

    this.marker = this.L.marker([lat, lng], { draggable: true }).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.setLocation(e.latlng.lat, e.latlng.lng, true);
    });

    this.marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      this.setLocation(pos.lat, pos.lng, true);
    });

    setTimeout(() => this.map.invalidateSize(true), 200);

    // If address empty, fill from reverse
    if (!this.form.value.addressText) {
      this.reverseGeocode(lat, lng);
    }
  }

  private setLocation(lat: number, lng: number, doReverse: boolean): void {
    if (!this.map || !this.marker) return;

    this.marker.setLatLng([lat, lng]);
    this.map.setView([lat, lng], 16, { animate: true });

    this.form.patchValue({
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
    });

    if (doReverse) this.reverseGeocode(lat, lng);
  }

  searchAddress(query: string): void {
    const q = (query || '').trim();
    if (!q) return;

    this.http
      .get<any>('https://api.openrouteservice.org/geocode/search', {
        params: { api_key: this.ORS_KEY, text: q, size: 1 },
      })
      .subscribe({
        next: (res) => {
          const f = res?.features?.[0];
          if (!f) return;

          const coords = f.geometry.coordinates; // [lng, lat]
          const lng = coords[0];
          const lat = coords[1];

          const label = f?.properties?.label || q;
          this.form.patchValue({ addressText: label });

          this.setLocation(lat, lng, false);
        },
        error: (err) => console.error('SEARCH ERROR', err),
      });
  }

  private reverseGeocode(lat: number, lng: number): void {
    this.http
      .get<any>('https://api.openrouteservice.org/geocode/reverse', {
        params: {
          api_key: this.ORS_KEY,
          point_lat: lat,
          point_lon: lng,
          size: 1,
        },
      })
      .subscribe({
        next: (res) => {
          const label = res?.features?.[0]?.properties?.label;
          if (label) this.form.patchValue({ addressText: label });
        },
        error: (err) => console.error('REVERSE ERROR', err),
      });
  }

  useMyLocation(): void {
    if (!this.isBrowser) return;

    this.locateError = '';
    this.isLocating = true;

    if (!navigator.geolocation) {
      this.isLocating = false;
      this.locateError = 'GPS not supported.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating = false;
        this.setLocation(pos.coords.latitude, pos.coords.longitude, true);
      },
      (err) => {
        this.isLocating = false;
        console.error(err);
        this.locateError = 'Allow location permission to use GPS.';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }
}