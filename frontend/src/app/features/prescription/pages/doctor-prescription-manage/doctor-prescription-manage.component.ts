import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { Prescription, PrescriptionFilterParams } from '../../models/prescription.model';
import { PrescriptionService } from '../../services/prescription.service';
import { PageResponse } from '../../models/page.model';

@Component({
  selector: 'app-doctor-prescription-manage',
  templateUrl: './doctor-prescription-manage.component.html'
})
export class DoctorPrescriptionManageComponent implements OnInit {
  currentUser: User | null = null;
  prescriptions: Prescription[] = [];
  summaryPrescriptions: Prescription[] = [];
  selectedPrescription: Prescription | null = null;

  loading = false;
  errorMessage = '';

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  filters: PrescriptionFilterParams = {
    status: '',
    renewable: undefined,
    expired: undefined,
    expiringSoon: undefined,
    hasAppointment: undefined,
    dateFrom: '',
    dateTo: '',
    sort: 'datePrescription,desc',
    page: 0,
    size: 10
  };

  constructor(
    private authService: AuthService,
    private prescriptionService: PrescriptionService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      if (user.role !== 'DOCTOR') {
        this.toastr.error('Access denied.');
        this.router.navigate(['/prescriptions']);
        return;
      }

      this.currentUser = user;
      this.loadSummary();
      this.loadPrescriptions();
    });
  }

  get totalIssued(): number {
    return this.summaryPrescriptions.length;
  }

  get activeCount(): number {
    return this.summaryPrescriptions.filter(item => item.statut === 'ACTIVE').length;
  }

  get expiringCount(): number {
    return this.summaryPrescriptions.filter(item => this.isExpiringSoon(item)).length;
  }

  get renewableCount(): number {
    return this.summaryPrescriptions.filter(item => item.renouvelable && item.nombreRenouvellements > 0).length;
  }

  private loadSummary(): void {
    if (!this.currentUser?.userId) {
      return;
    }

    this.prescriptionService.getPrescriptionsByDoctor(this.currentUser.userId).subscribe({
      next: (prescriptions) => {
        this.summaryPrescriptions = prescriptions;
      },
      error: () => {
        this.summaryPrescriptions = [];
      }
    });
  }

  loadPrescriptions(): void {
    if (!this.currentUser?.userId) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.prescriptionService.filterPrescriptions({
      ...this.filters,
      page: this.page,
      size: this.size
    }).subscribe({
      next: (response: PageResponse<Prescription>) => {
        this.prescriptions = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.page = response.number;
        this.loading = false;
      },
      error: () => {
        this.loadPrescriptionsFallback();
      }
    });
  }

  private loadPrescriptionsFallback(): void {
    if (!this.currentUser?.userId) {
      this.loading = false;
      return;
    }

    this.prescriptionService.getPrescriptionsByDoctor(this.currentUser.userId).subscribe({
      next: (prescriptions) => {
        const filtered = this.applyClientFilters(prescriptions);
        const start = this.page * this.size;
        const end = start + this.size;

        this.summaryPrescriptions = prescriptions;
        this.prescriptions = filtered.slice(start, end);
        this.totalElements = filtered.length;
        this.totalPages = Math.max(Math.ceil(filtered.length / this.size), 1);
        this.loading = false;
        this.errorMessage = 'Advanced filters are temporarily using local fallback mode.';
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to load prescriptions.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.page = 0;
    this.loadPrescriptions();
  }

  resetFilters(): void {
    this.filters = {
      status: '',
      renewable: undefined,
      expired: undefined,
      expiringSoon: undefined,
      hasAppointment: undefined,
      dateFrom: '',
      dateTo: '',
      sort: 'datePrescription,desc',
      page: 0,
      size: 10
    };
    this.page = 0;
    this.loadPrescriptions();
  }

  viewPrescription(prescription: Prescription): void {
    this.selectedPrescription = prescription;
  }

  closeDetails(): void {
    this.selectedPrescription = null;
  }

  onPrescriptionUpdated(): void {
    this.closeDetails();
    this.loadPrescriptions();
  }

  renewPrescription(prescription: Prescription): void {
    const newDateFin = window.prompt('New end date (YYYY-MM-DD):', prescription.dateFin);
    if (!newDateFin) {
      return;
    }

    this.prescriptionService.renewPrescription(prescription.prescriptionId, { newDateFin }).subscribe({
      next: () => {
        this.toastr.success('Prescription renewed.');
        this.selectedPrescription = null;
        this.loadPrescriptions();
      },
      error: (error) => this.toastr.error(error?.error?.message || 'Failed to renew prescription.')
    });
  }

  cancelPrescription(prescription: Prescription): void {
    if (!window.confirm('Cancel this prescription?')) {
      return;
    }

    this.prescriptionService.cancelPrescription(prescription.prescriptionId).subscribe({
      next: () => {
        this.toastr.info('Prescription cancelled.');
        this.selectedPrescription = null;
        this.loadPrescriptions();
      },
      error: (error) => this.toastr.error(error?.error?.message || 'Failed to cancel prescription.')
    });
  }

  terminatePrescription(prescription: Prescription): void {
    if (!window.confirm('Mark this prescription as completed?')) {
      return;
    }

    this.prescriptionService.terminatePrescription(prescription.prescriptionId).subscribe({
      next: () => {
        this.toastr.success('Prescription marked as completed.');
        this.selectedPrescription = null;
        this.loadPrescriptions();
      },
      error: (error) => this.toastr.error(error?.error?.message || 'Failed to complete prescription.')
    });
  }

  generatePdf(prescription: Prescription): void {
    this.prescriptionService.generatePdf(prescription.prescriptionId).subscribe({
      next: () => {
        this.toastr.success('PDF generated.');
        this.loadPrescriptions();
      },
      error: (error) => this.toastr.error(error?.error?.message || 'Failed to generate PDF.')
    });
  }

  downloadPdf(prescription: Prescription): void {
    try {
      this.prescriptionService.downloadPdf(prescription.prescriptionId);
      this.toastr.success('PDF download started.');
    } catch (error) {
      this.toastr.error('Failed to download PDF.');
    }
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }

    this.page += 1;
    this.loadPrescriptions();
  }

  previousPage(): void {
    if (this.page === 0) {
      return;
    }

    this.page -= 1;
    this.loadPrescriptions();
  }

  getStatusClass(status: Prescription['statut']): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'RENOUVELEE': return 'bg-blue-100 text-blue-700';
      case 'INTERROMPUE': return 'bg-red-100 text-red-700';
      case 'TERMINEE': return 'bg-slate-100 text-slate-700';
      case 'EXPIREE': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  trackByPrescription(_: number, prescription: Prescription): string {
    return prescription.prescriptionId;
  }

  private applyClientFilters(prescriptions: Prescription[]): Prescription[] {
    let filtered = [...prescriptions];

    if (this.filters.status) {
      filtered = filtered.filter(item => item.statut === this.filters.status);
    }

    if (this.filters.renewable !== undefined) {
      filtered = filtered.filter(item => item.renouvelable === this.filters.renewable);
    }

    if (this.filters.hasAppointment !== undefined) {
      filtered = filtered.filter(item => this.filters.hasAppointment ? !!item.appointment : !item.appointment);
    }

    if (this.filters.expiringSoon) {
      filtered = filtered.filter(item => this.isExpiringSoon(item));
    }

    if (this.filters.expired) {
      filtered = filtered.filter(item => this.isExpired(item));
    }

    if (this.filters.dateFrom) {
      filtered = filtered.filter(item => item.datePrescription >= this.filters.dateFrom!);
    }

    if (this.filters.dateTo) {
      filtered = filtered.filter(item => item.datePrescription <= this.filters.dateTo!);
    }

    return this.sortClientResults(filtered);
  }

  private sortClientResults(prescriptions: Prescription[]): Prescription[] {
    const sortValue = this.filters.sort || 'datePrescription,desc';
    const [field, direction] = sortValue.split(',');
    const multiplier = direction === 'asc' ? 1 : -1;

    return prescriptions.sort((a, b) => {
      const first = (a as unknown as Record<string, string>)[field] || '';
      const second = (b as unknown as Record<string, string>)[field] || '';
      return first.localeCompare(second) * multiplier;
    });
  }

  private isExpired(prescription: Prescription): boolean {
    return !!prescription.dateFin && prescription.dateFin < new Date().toISOString().slice(0, 10);
  }

  private isExpiringSoon(prescription: Prescription): boolean {
    if (!prescription.dateFin || prescription.statut !== 'ACTIVE') {
      return false;
    }

    const today = new Date();
    const endDate = new Date(prescription.dateFin);
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }
}
