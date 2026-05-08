import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { AuthService, UpdateUserRequest } from '../login/auth.service';
import { COUNTRY_PHONE_CODES, CountryPhoneCode, countryFlag } from '../../../../shared/utils/country-phone-codes';

function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }

  if (!/^\+?[0-9()\-\s]+$/.test(value)) {
    return { invalidPhone: true };
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return { invalidPhoneLength: true };
  }

  if (/^(\d)\1+$/.test(digits)) {
    return { invalidPhone: true };
  }

  return null;
}

function dateOfBirthValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { invalidDate: true };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) {
    return { futureDate: true };
  }

  const oldestAllowed = new Date(today);
  oldestAllowed.setFullYear(today.getFullYear() - 120);
  if (date < oldestAllowed) {
    return { tooOld: true };
  }

  return null;
}

@Component({
  selector: 'app-setup-profile',
  templateUrl: './setup-profile.component.html',
  styleUrls: ['./setup-profile.component.css'],
})
export class SetupProfileComponent implements OnInit {
  profileForm: FormGroup;
  profileImage: string | null = null;
  selectedFile: File | null = null;
  imageChangedEvent: Event | null = null;
  croppedImageBlob: Blob | null = null;
  showCropper = false;
  isLoading = false;
  readonly countries = COUNTRY_PHONE_CODES;
  phoneCountryCode = '+1';
  emergencyCountryCode = '+1';
  phoneCountrySearch = '';
  emergencyCountrySearch = '';
  countrySearch = '';
  showPhoneCountryDropdown = false;
  showEmergencyCountryDropdown = false;
  showCountryDropdown = false;
  selectedCountryIso = 'US';
  showDatePicker = false;
  currentCalendarDate = this.createDefaultCalendarDate();
  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly maxBirthDate = new Date().toISOString().split('T')[0];
  readonly minBirthDate = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 120);
    return date.toISOString().split('T')[0];
  })();

  // User data from registration (passed via state)
  name: string = '';
  email: string = '';
  role: string = '';

  // For conditional rendering
  workplaceType: 'hospital' | 'private' = 'hospital';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { name: string; email: string; role: string };
    if (state) {
      this.name = state.name;
      this.email = state.email;
      this.role = state.role;
    } else {
      this.router.navigate(['/']);
    }

    // Build form with all possible fields
    this.profileForm = this.fb.group({
      dateOfBirth: ['', [Validators.required, dateOfBirthValidator]],
      age: [{ value: '', disabled: true }],
      phoneNumber: ['', [Validators.required, phoneNumberValidator]],
      country: ['United States'],
      address: [''],
      emergencyContact: [''],           // initially no validator
      connectedEmail: ['', Validators.email], // email validator only, not required
      yearsExperience: [''],
      specialization: [''],
      medicalLicense: [''],
      workplace: [''],
    });

    this.updateValidators();
  }

  ngOnInit(): void {}

  get selectedPhoneCountry(): CountryPhoneCode {
    return this.countries.find(country => country.dialCode === this.phoneCountryCode && country.iso2 === 'US') ||
      this.countries.find(country => country.dialCode === this.phoneCountryCode) ||
      this.countries[0];
  }

  get selectedEmergencyCountry(): CountryPhoneCode {
    return this.countries.find(country => country.dialCode === this.emergencyCountryCode && country.iso2 === 'US') ||
      this.countries.find(country => country.dialCode === this.emergencyCountryCode) ||
      this.countries[0];
  }

  get filteredPhoneCountries(): CountryPhoneCode[] {
    return this.filterCountries(this.phoneCountrySearch);
  }

  get filteredEmergencyCountries(): CountryPhoneCode[] {
    return this.filterCountries(this.emergencyCountrySearch);
  }

  get filteredProfileCountries(): CountryPhoneCode[] {
    return this.filterCountries(this.countrySearch);
  }

  get selectedProfileCountry(): CountryPhoneCode {
    return this.countries.find(country => country.iso2 === this.selectedCountryIso) || this.countries[0];
  }

  get phoneMaxLength(): number {
    return this.localPhoneMaxLength(this.phoneCountryCode);
  }

  get emergencyPhoneMaxLength(): number {
    return this.localPhoneMaxLength(this.emergencyCountryCode);
  }

  flagFor(country: CountryPhoneCode): string {
    return countryFlag(country.iso2);
  }

  get selectedDateLabel(): string {
    const value = this.profileForm.get('dateOfBirth')?.value;
    if (!value) {
      return 'Select date of birth';
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return 'Select date of birth';
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get currentCalendarLabel(): string {
    return `${this.monthNames[this.currentCalendarDate.getMonth()]} ${this.currentCalendarDate.getFullYear()}`;
  }

  get calendarYears(): number[] {
    const maxYear = new Date(this.maxBirthDate).getFullYear();
    const minYear = new Date(this.minBirthDate).getFullYear();
    const years: number[] = [];
    for (let year = maxYear; year >= minYear; year--) {
      years.push(year);
    }
    return years;
  }

  get calendarDays(): Array<{ date: string; day: number; muted: boolean; disabled: boolean; selected: boolean }> {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    const selected = this.profileForm.get('dateOfBirth')?.value;
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateString = this.formatDateValue(date);
      return {
        date: dateString,
        day: date.getDate(),
        muted: date.getMonth() !== month,
        disabled: dateString < this.minBirthDate || dateString > this.maxBirthDate,
        selected: selected === dateString
      };
    });
  }

  /**
   * Dynamically set required validators based on role.
   */
  private updateValidators(): void {
    const emergencyControl = this.profileForm.get('emergencyContact');
    const yearsControl = this.profileForm.get('yearsExperience');
    const workplaceControl = this.profileForm.get('workplace');

    // Clear all role‑specific validators first
    emergencyControl?.clearValidators();
    yearsControl?.clearValidators();
    workplaceControl?.clearValidators();

    if (this.role === 'PATIENT' || this.role === 'CAREGIVER') {
      // emergency contact is required for patients and caregivers
      emergencyControl?.setValidators([Validators.required, phoneNumberValidator]);
    } else if (this.role === 'DOCTOR') {
      // experience and workplace required for doctors
      yearsControl?.setValidators([Validators.required, Validators.min(0), Validators.max(60)]);
      workplaceControl?.setValidators(Validators.required);
      emergencyControl?.setValidators(phoneNumberValidator);
      // emergency contact is optional for doctors
    }

    // Update validity
    emergencyControl?.updateValueAndValidity();
    yearsControl?.updateValueAndValidity();
    workplaceControl?.updateValueAndValidity();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imageChangedEvent = event;
      this.showCropper = true;
      this.croppedImageBlob = null;
    }
  }

  imageCropped(event: ImageCroppedEvent): void {
    this.croppedImageBlob = event.blob || null;
  }

  cancelCrop(): void {
    this.showCropper = false;
    this.imageChangedEvent = null;
    this.croppedImageBlob = null;
  }

  confirmCrop(): void {
    if (!this.croppedImageBlob) {
      this.toastr.warning('Please crop the image first');
      return;
    }

    const originalFile = (this.imageChangedEvent as any)?.target?.files?.[0];
    const fileType = originalFile?.type || 'image/png';
    const fileName = originalFile?.name || 'profile-picture.png';
    this.selectedFile = new File([this.croppedImageBlob], fileName, { type: fileType });
    this.profileImage = URL.createObjectURL(this.selectedFile);
    this.showCropper = false;
    this.imageChangedEvent = null;
    this.croppedImageBlob = null;
  }

  triggerFileInput(): void {
    document.getElementById('profile-picture-input')?.click();
  }

  getInitials(): string {
    return this.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  getRoleColor(): string {
    switch (this.role) {
      case 'PATIENT': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'CAREGIVER': return 'bg-green-100 text-green-700 border-green-300';
      case 'DOCTOR': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  onSubmit(): void {
    // Log invalid fields for debugging
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        if (control?.invalid) {
          console.log(`Field ${key} is invalid:`, control.errors);
        }
      });
      this.profileForm.markAllAsTouched();
      this.toastr.warning('Please fill all required fields correctly');
      return;
    }

    this.isLoading = true;

    const formValue = this.profileForm.value;
    const updateData: UpdateUserRequest = {
      dateOfBirth: formValue.dateOfBirth,
      phone: this.composePhoneNumber(this.phoneCountryCode, formValue.phoneNumber),
      country: formValue.country || this.selectedProfileCountry.name,
    };

    if (formValue.address && formValue.address.trim() !== '') {
      updateData.address = formValue.address.trim();
    }

    // Only include emergencyContact if it has a value (doctors may leave it blank)
    if (formValue.emergencyContact && formValue.emergencyContact.trim() !== '') {
      updateData.emergencyContact = this.composePhoneNumber(this.emergencyCountryCode, formValue.emergencyContact);
    }

    // Only include connectedEmail if not empty
    if (formValue.connectedEmail && formValue.connectedEmail.trim() !== '') {
      updateData.connectedEmail = formValue.connectedEmail;
    }

    if (this.role === 'DOCTOR') {
      updateData.yearsExperience = formValue.yearsExperience ? parseInt(formValue.yearsExperience) : undefined;
      updateData.specialization = formValue.specialization;
      updateData.medicalLicense = formValue.medicalLicense;
      updateData.workplaceType = this.workplaceType;
      updateData.workplaceName = formValue.workplace;
    }

    // If a profile picture was selected, upload it first
    if (this.selectedFile) {
      this.authService.uploadProfilePicture(this.selectedFile).subscribe({
        next: (picResponse) => {
          updateData.profilePicture = picResponse.profilePicture;
          this.sendProfileUpdate(updateData);
        },
        error: (err) => {
          this.toastr.error('Failed to upload profile picture');
          this.isLoading = false;
        }
      });
    } else {
      this.sendProfileUpdate(updateData);
    }
  }

  getPhoneError(controlName: 'phoneNumber' | 'emergencyContact'): string {
    const control = this.profileForm.get(controlName);
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return controlName === 'phoneNumber' ? 'Phone number is required.' : 'Emergency contact is required.';
    }

    if (control.errors['invalidPhoneLength']) {
      return 'Enter a valid phone number with 8 to 15 digits.';
    }

    return 'Enter a valid phone number using digits, spaces, +, -, or parentheses.';
  }

  getDateOfBirthError(): string {
    const control = this.profileForm.get('dateOfBirth');
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Date of birth is required.';
    }

    if (control.errors['futureDate']) {
      return 'Date of birth must be in the past.';
    }

    if (control.errors['tooOld']) {
      return 'Please enter a realistic date of birth.';
    }

    return 'Please enter a valid date of birth.';
  }

  onDateOfBirthChange(): void {
    const age = this.calculateAge(this.profileForm.get('dateOfBirth')?.value);
    this.profileForm.get('age')?.setValue(age === null ? '' : age);
  }

  toggleDatePicker(): void {
    const value = this.profileForm.get('dateOfBirth')?.value;
    if (value) {
      const selectedDate = new Date(`${value}T00:00:00`);
      if (!Number.isNaN(selectedDate.getTime())) {
        this.currentCalendarDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      }
    }
    this.showDatePicker = !this.showDatePicker;
  }

  closeDatePicker(): void {
    this.showDatePicker = false;
    this.profileForm.get('dateOfBirth')?.markAsTouched();
  }

  previousMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
  }

  nextMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
  }

  changeCalendarMonth(monthIndex: string | number): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      Number(monthIndex),
      1
    );
  }

  changeCalendarYear(year: string | number): void {
    this.currentCalendarDate = new Date(
      Number(year),
      this.currentCalendarDate.getMonth(),
      1
    );
  }

  selectCalendarDay(day: { date: string; disabled: boolean }): void {
    if (day.disabled) {
      return;
    }
    this.profileForm.get('dateOfBirth')?.setValue(day.date);
    this.profileForm.get('dateOfBirth')?.markAsTouched();
    this.onDateOfBirthChange();
    this.showDatePicker = false;
  }

  selectCountry(country: CountryPhoneCode, target: 'phone' | 'emergency'): void {
    if (target === 'phone') {
      this.phoneCountryCode = country.dialCode;
      this.phoneCountrySearch = '';
      this.showPhoneCountryDropdown = false;
    } else {
      this.emergencyCountryCode = country.dialCode;
      this.emergencyCountrySearch = '';
      this.showEmergencyCountryDropdown = false;
    }
  }

  selectProfileCountry(country: CountryPhoneCode): void {
    this.selectedCountryIso = country.iso2;
    this.countrySearch = '';
    this.showCountryDropdown = false;
    this.profileForm.get('country')?.setValue(country.name);
  }

  trimPhoneInput(controlName: 'phoneNumber' | 'emergencyContact', maxLength: number): void {
    const control = this.profileForm.get(controlName);
    const digits = String(control?.value ?? '').replace(/\D/g, '').slice(0, maxLength);
    if (control?.value !== digits) {
      control?.setValue(digits, { emitEvent: false });
    }
  }

  private filterCountries(search: string): CountryPhoneCode[] {
    const query = search.trim().toLowerCase();
    if (!query) {
      return this.countries;
    }

    return this.countries.filter(country =>
      country.name.toLowerCase().startsWith(query) ||
      country.name.toLowerCase().includes(query) ||
      country.dialCode.includes(query) ||
      country.iso2.toLowerCase().startsWith(query)
    );
  }

  private composePhoneNumber(countryCode: string, value: string): string {
    const phone = String(value ?? '').trim();
    if (!phone) return '';
    return phone.startsWith('+') ? phone : `${countryCode} ${phone}`;
  }

  private localPhoneMaxLength(countryCode: string): number {
    const dialDigits = countryCode.replace(/\D/g, '').length;
    return Math.max(4, 15 - dialDigits);
  }

  private calculateAge(value: string): number | null {
    if (!value) return null;
    const birthDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }

  private createDefaultCalendarDate(): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 30);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private formatDateValue(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  private sendProfileUpdate(updateData: UpdateUserRequest): void {
    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.toastr.success('Profile setup complete!');
        if (response.user) {
          this.authService.fetchCurrentUser().subscribe();
        }
        this.router.navigate(['/setup-face-id'], { queryParams: { mode: 'onboarding' } });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Profile update failed', err);
        const errorMsg = err.error?.message || 'Failed to save profile. Please try again.';
        this.toastr.error(errorMsg);
        this.isLoading = false;
      }
    });
  }
}
