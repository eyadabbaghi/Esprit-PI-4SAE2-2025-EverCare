import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { Prescription } from '../../models/prescription.model';
import { PrescriptionAnalyticsSummary, StatusCount, TopMedicament } from '../../models/prescription-analytics.model';
import { PrescriptionService } from '../../services/prescription.service';

@Component({
  selector: 'app-doctor-prescription-analytics',
  templateUrl: './doctor-prescription-analytics.component.html'
})
export class DoctorPrescriptionAnalyticsComponent implements OnInit {
  currentUser: User | null = null;
  loading = false;
  errorMessage = '';

  summary: PrescriptionAnalyticsSummary | null = null;
  statusBreakdown: StatusCount[] = [];
  topMedicaments: TopMedicament[] = [];
  expiringPrescriptions: Prescription[] = [];

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
      this.loadAnalytics();
    });
  }

  loadAnalytics(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      summary: this.prescriptionService.getAnalyticsSummary(),
      statusBreakdown: this.prescriptionService.getStatusBreakdown(),
      topMedicaments: this.prescriptionService.getTopMedicaments(5),
      expiring: this.prescriptionService.filterPrescriptions({
        expiringSoon: true,
        status: 'ACTIVE',
        size: 5,
        page: 0,
        sort: 'dateFin,asc'
      })
    }).subscribe({
      next: ({ summary, statusBreakdown, topMedicaments, expiring }) => {
        this.summary = summary;
        this.statusBreakdown = statusBreakdown;
        this.topMedicaments = topMedicaments;
        this.expiringPrescriptions = expiring.content;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to load analytics.';
        this.loading = false;
      }
    });
  }

  getStatusWidth(count: number): number {
    const max = Math.max(...this.statusBreakdown.map(item => item.count), 1);
    return Math.max((count / max) * 100, 8);
  }

  openManage(): void {
    this.router.navigate(['/prescriptions/doctor/manage']);
  }

  openPrescribe(): void {
    this.router.navigate(['/prescriptions/doctor/prescribe']);
  }

  trackByStatus(_: number, item: StatusCount): string {
    return item.status;
  }

  trackByMedicament(_: number, item: TopMedicament): string {
    return item.medicamentId;
  }

  trackByPrescription(_: number, item: Prescription): string {
    return item.prescriptionId;
  }
}
