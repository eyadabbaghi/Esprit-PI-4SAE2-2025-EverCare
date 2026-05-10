import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../login/auth.service';
import { COUNTRY_PHONE_CODES, CountryPhoneCode, countryFlag } from '../../../../shared/utils/country-phone-codes';

@Component({
  selector: 'app-doctors',
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css'],
})
export class DoctorsComponent implements OnInit {
  currentUser: User | null = null;
  doctors: User[] = [];
  associatedPatients: User[] = [];
  selectedPatientId = '';
  searchTerm = '';
  countrySearch = '';
  selectedCountry = '';
  showCountryMenu = false;
  isLoading = false;
  pinnedDoctorEmails = new Set<string>();
  readonly countries = COUNTRY_PHONE_CODES;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    if (!this.isPatient && !this.isCaregiver) {
      this.toastr.info('Doctor search is available for patients and caregivers.');
      this.router.navigate(['/']);
      return;
    }
    this.selectedCountry = this.currentUser?.country || '';
    this.loadPinnedDoctors();
    this.loadDoctors();
    this.loadAssociatedPatients();
  }

  get isPatient(): boolean {
    return this.currentUser?.role === 'PATIENT';
  }

  get isCaregiver(): boolean {
    return this.currentUser?.role === 'CAREGIVER';
  }

  get selectedPatient(): User | null {
    return this.associatedPatients.find(patient => patient.userId === this.selectedPatientId) || null;
  }

  get filteredCountries(): CountryPhoneCode[] {
    const query = this.countrySearch.trim().toLowerCase();
    if (!query) return this.countries;
    return this.countries.filter(country =>
      country.name.toLowerCase().includes(query) || country.iso2.toLowerCase().startsWith(query)
    );
  }

  get visibleDoctors(): User[] {
    const query = this.searchTerm.trim().toLowerCase();
    const country = this.selectedCountry.trim().toLowerCase();

    return this.doctors
      .filter(doctor => {
        const matchesQuery = !query || [
          doctor.name,
          doctor.specialization,
          doctor.workplaceName,
          doctor.country,
        ].some(value => String(value || '').toLowerCase().includes(query));

        const matchesCountry = !country || String(doctor.country || '').toLowerCase() === country;
        return matchesQuery && matchesCountry;
      })
      .sort((left, right) => Number(this.isPinned(right)) - Number(this.isPinned(left)));
  }

  get pinnedDoctors(): User[] {
    return this.visibleDoctors.filter(doctor => this.isPinned(doctor));
  }

  flagForCountryName(countryName?: string): string {
    const country = this.countries.find(item => item.name.toLowerCase() === String(countryName || '').toLowerCase());
    return country ? countryFlag(country.iso2) : '🌐';
  }

  selectCountry(country: CountryPhoneCode | null): void {
    this.selectedCountry = country?.name || '';
    this.countrySearch = '';
    this.showCountryMenu = false;
  }

  associateDoctor(doctor: User): void {
    if (!this.currentUser || this.isDoctorAssociated(doctor) || !doctor.email) return;

    if (this.isPatient) {
      this.updatePatientDoctor(doctor);
      return;
    }

    if (this.isCaregiver) {
      const patient = this.selectedPatient;
      if (!patient?.userId) {
        this.toastr.warning('Choose one of your associated patients first.');
        return;
      }

      this.isLoading = true;
      this.authService.assignDoctorToPatient(patient.userId, doctor.email)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: () => {
            this.addDoctorEmail(patient, doctor.email);
            this.toastr.success(`Dr. ${doctor.name} associated with ${patient.name}`);
          },
          error: () => this.toastr.error('Could not associate this doctor.'),
        });
    }
  }

  contactDoctor(doctor: User): void {
    if (!this.isDoctorAssociated(doctor) || !doctor.email) return;
    this.router.navigate(['/communication'], { queryParams: { contact: doctor.email } });
  }

  isDoctorAssociated(doctor: User): boolean {
    if (!doctor.email) return false;
    if (this.isPatient) {
      return this.userDoctorEmails(this.currentUser).includes(this.normalizeEmail(doctor.email));
    }
    if (this.isCaregiver) {
      const patient = this.selectedPatient;
      return this.userDoctorEmails(patient).includes(this.normalizeEmail(doctor.email));
    }
    return false;
  }

  isPinned(doctor: User): boolean {
    return this.pinnedDoctorEmails.has(doctor.email);
  }

  togglePin(doctor: User): void {
    if (!doctor.email) return;
    if (this.isPinned(doctor)) {
      this.pinnedDoctorEmails.delete(doctor.email);
    } else {
      this.pinnedDoctorEmails.add(doctor.email);
    }
    this.savePinnedDoctors();
  }

  initials(name?: string): string {
    return String(name || 'DR')
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  handleImageError(doctor: User): void {
    doctor.profilePicture = undefined;
  }

  private updatePatientDoctor(doctor: User): void {
    this.isLoading = true;
    this.authService.updateProfile({ doctorEmail: doctor.email })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          if (this.currentUser) {
            this.addDoctorEmail(this.currentUser, doctor.email);
            this.authService.setCurrentUser(this.currentUser);
          }
          this.authService.fetchCurrentUser().subscribe();
          this.toastr.success(`Dr. ${doctor.name} added to your care team`);
        },
        error: () => this.toastr.error('Could not associate this doctor.'),
      });
  }

  private loadDoctors(): void {
    this.isLoading = true;
    this.authService.searchUsersByRole('', 'DOCTOR')
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: doctors => this.doctors = doctors,
        error: () => this.toastr.error('Could not load doctors.'),
      });
  }

  private loadAssociatedPatients(): void {
    if (!this.currentUser || this.currentUser.role !== 'CAREGIVER') return;

    const patientEmails = this.currentUser.patientEmails || [];
    if (!patientEmails.length) return;

    forkJoin(patientEmails.map(email =>
      this.authService.getUserByEmail(email).pipe(catchError(() => of(null)))
    )).subscribe(patients => {
      this.associatedPatients = patients.filter((patient): patient is User => !!patient);
      this.selectedPatientId = this.associatedPatients[0]?.userId || '';
    });
  }

  private userDoctorEmails(user: User | null): string[] {
    if (!user) return [];
    return [
      user.doctorEmail,
      ...(Array.isArray(user.doctorEmails) ? user.doctorEmails : [])
    ]
      .map(email => this.normalizeEmail(email))
      .filter(Boolean)
      .filter((email, index, all) => all.indexOf(email) === index);
  }

  private addDoctorEmail(user: User, email: string): void {
    const doctorEmails = [...this.userDoctorEmails(user), this.normalizeEmail(email)]
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index);
    user.doctorEmails = doctorEmails;
    user.doctorEmail = doctorEmails[0] || '';
  }

  private normalizeEmail(email?: string | null): string {
    return String(email || '').trim().toLowerCase();
  }

  private pinnedStorageKey(): string {
    return `evercare_pinned_doctors:${this.currentUser?.userId || this.currentUser?.email || 'guest'}`;
  }

  private loadPinnedDoctors(): void {
    try {
      const raw = localStorage.getItem(this.pinnedStorageKey());
      const emails = raw ? JSON.parse(raw) as string[] : [];
      this.pinnedDoctorEmails = new Set(emails);
    } catch {
      this.pinnedDoctorEmails = new Set<string>();
    }
  }

  private savePinnedDoctors(): void {
    localStorage.setItem(this.pinnedStorageKey(), JSON.stringify([...this.pinnedDoctorEmails]));
  }
}
