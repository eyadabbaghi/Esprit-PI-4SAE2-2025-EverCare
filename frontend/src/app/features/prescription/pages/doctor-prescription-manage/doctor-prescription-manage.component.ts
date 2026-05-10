import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { Prescription, PrescriptionFilterParams, PrescriptionRequest } from '../../models/prescription.model';
import { PrescriptionService } from '../../services/prescription.service';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';

@Component({
  selector: 'app-doctor-prescription-manage',
  templateUrl: './doctor-prescription-manage.component.html',
  styleUrls: ['./doctor-prescription-manage.component.css']
})
export class DoctorPrescriptionManageComponent implements OnInit {
  currentUser: User | null = null;
  prescriptions: Prescription[] = [];
  summaryPrescriptions: Prescription[] = [];
  selectedPrescription: Prescription | null = null;
  editingPrescription: Prescription | null = null;
  editForm: PrescriptionRequest | null = null;
  editSaving = false;

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
    private toastr: ToastrService,
    private feedback: AppFeedbackService
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
        this.summaryPrescriptions = prescriptions.map(prescription => this.normalizePrescription(prescription));
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

    this.prescriptionService.getPrescriptionsByDoctor(this.currentUser.userId).subscribe({
      next: (prescriptions) => {
        const normalized = prescriptions.map(prescription => this.normalizePrescription(prescription));
        const filtered = this.applyClientFilters(normalized);
        const start = this.page * this.size;
        const end = start + this.size;

        this.summaryPrescriptions = normalized;
        this.prescriptions = filtered.slice(start, end);
        this.totalElements = filtered.length;
        this.totalPages = Math.max(Math.ceil(filtered.length / this.size), 1);
        this.loading = false;
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
    this.selectedPrescription = this.normalizePrescription(prescription);
  }

  closeDetails(): void {
    this.selectedPrescription = null;
  }

  editPrescription(prescription: Prescription): void {
    const normalized = this.normalizePrescription(prescription);
    const raw = prescription as Prescription & {
      patientId?: string;
      doctorId?: string;
      medicamentId?: string;
    };
    const patientId = normalized.patient.userId || raw.patientId;
    const doctorId = this.currentUser?.userId || normalized.doctor.userId || raw.doctorId;
    const medicamentId = normalized.medicament.medicamentId || raw.medicamentId;

    if (!patientId || !doctorId || !medicamentId) {
      this.toastr.error('Prescription data is incomplete. Please refresh and try again.');
      return;
    }

    this.editingPrescription = normalized;
    this.editForm = {
      patientId,
      doctorId,
      medicamentId,
      appointmentId: normalized.appointment?.appointmentId,
      dateDebut: normalized.dateDebut,
      dateFin: normalized.dateFin,
      posologie: normalized.posologie,
      instructions: normalized.instructions || '',
      renouvelable: normalized.renouvelable,
      nombreRenouvellements: normalized.nombreRenouvellements || 0,
      priseMatin: normalized.priseMatin || '',
      priseMidi: normalized.priseMidi || '',
      priseSoir: normalized.priseSoir || '',
      resumeSimple: normalized.resumeSimple || '',
      notesMedecin: normalized.notesMedecin || ''
    };
  }

  closeEdit(): void {
    this.editingPrescription = null;
    this.editForm = null;
    this.editSaving = false;
  }

  savePrescriptionEdit(): void {
    if (!this.editingPrescription || !this.editForm) {
      return;
    }

    this.editSaving = true;
    this.prescriptionService.updatePrescription(this.editingPrescription.prescriptionId, this.editForm).subscribe({
      next: () => {
        this.toastr.success('Prescription updated.');
        this.closeEdit();
        this.loadSummary();
        this.loadPrescriptions();
      },
      error: (error) => {
        this.editSaving = false;
        this.toastr.error(error?.error?.message || 'Failed to update prescription.');
      }
    });
  }

  onPrescriptionUpdated(): void {
    this.closeDetails();
    this.loadPrescriptions();
  }

  async renewPrescription(prescription: Prescription): Promise<void> {
    const newDateFin = await this.feedback.prompt({
      title: 'Renew prescription',
      message: 'Enter the new end date in YYYY-MM-DD format.',
      value: prescription.dateFin,
      placeholder: 'YYYY-MM-DD',
      confirmText: 'Renew'
    });
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

  async cancelPrescription(prescription: Prescription): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Cancel prescription?',
      message: 'This prescription will be marked as cancelled.',
      confirmText: 'Cancel prescription',
      tone: 'danger'
    });

    if (!confirmed) {
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

  async deletePrescription(prescription: Prescription): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Delete prescription?',
      message: 'This permanently removes the prescription from the system.',
      confirmText: 'Delete',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.prescriptionService.deletePrescription(prescription.prescriptionId).subscribe({
      next: () => {
        this.toastr.success('Prescription deleted.');
        this.selectedPrescription = null;
        this.loadSummary();
        this.loadPrescriptions();
      },
      error: (error) => this.toastr.error(error?.error?.message || 'Failed to delete prescription.')
    });
  }

  async terminatePrescription(prescription: Prescription): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Complete prescription?',
      message: 'Mark this prescription as completed for the patient record.',
      confirmText: 'Mark completed'
    });

    if (!confirmed) {
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

  private normalizePrescription(prescription: Prescription): Prescription {
    const raw = prescription as Prescription & {
      patientId?: string;
      doctorId?: string;
      medicamentId?: string;
    };
    const patientId = prescription.patient?.userId || raw.patientId || '';
    const doctorId = prescription.doctor?.userId || raw.doctorId || this.currentUser?.userId || '';

    return {
      ...prescription,
      patient: prescription.patient || {
        userId: patientId,
        name: patientId ? `Patient ${patientId.slice(0, 8)}` : 'Unknown patient',
        email: ''
      },
      doctor: prescription.doctor || {
        userId: doctorId,
        name: this.currentUser?.name || 'Doctor',
        specialization: this.currentUser?.specialization
      },
      medicament: prescription.medicament || {
        medicamentId: raw.medicamentId || '',
        nomCommercial: 'Medication',
        denominationCommuneInternationale: '',
        dosage: '',
        forme: ''
      },
      renouvelable: Boolean(prescription.renouvelable),
      nombreRenouvellements: prescription.nombreRenouvellements || 0
    };
  }
}
