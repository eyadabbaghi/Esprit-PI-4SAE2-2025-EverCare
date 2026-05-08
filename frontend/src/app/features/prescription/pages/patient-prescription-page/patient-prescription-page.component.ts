import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { PrescriptionService } from '../../services/prescription.service';
import { Prescription, PrescriptionRequest } from '../../models/prescription.model';

@Component({
  selector: 'app-patient-prescription-page',
  templateUrl: './patient-prescription-page.component.html',
  styleUrls: ['./patient-prescription-page.component.css']
})
export class PatientPrescriptionPageComponent implements OnInit {

  currentUser: User | null = null;

  activeTab: 'active' | 'history' | 'today' = 'active';

  allPrescriptions: Prescription[] = [];
  activePrescriptions: Prescription[] = [];
  pastPrescriptions: Prescription[] = [];
  todayPrescriptions: Prescription[] = [];

  selectedPrescription: Prescription | null = null;

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private prescriptionService: PrescriptionService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      if (user.role !== 'PATIENT') {
        this.toastr.error('Access denied.');
        this.router.navigate(['/prescriptions']);
        return;
      }
      this.currentUser = user;
      this.route.url.subscribe(() => this.applyRouteState());
      this.route.paramMap.subscribe(() => this.applyRouteState());
      this.loadPrescriptions();
    });
  }

  loadPrescriptions(): void {
    if (!this.currentUser?.userId) return;
    this.loading = true;

    this.prescriptionService.getPrescriptionsByPatient(this.currentUser.userId)
      .subscribe({
        next: (data) => {
          this.allPrescriptions = data;
          this.splitPrescriptions(data);
          this.applyRouteState();
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load prescriptions.';
          this.loading = false;
        }
      });

    this.prescriptionService.getTodayPrescriptions(this.currentUser.userId)
      .subscribe({
        next: (data) => { this.todayPrescriptions = data; },
        error: () => {}
      });
  }

  private splitPrescriptions(prescriptions: Prescription[]): void {
    this.activePrescriptions = prescriptions.filter(p => p.statut === 'ACTIVE');
    this.pastPrescriptions   = prescriptions.filter(p => p.statut !== 'ACTIVE');
  }

  // ========== STATS ==========

  get activeCount(): number {
    return this.activePrescriptions.length;
  }

  get expiringCount(): number {
    return this.activePrescriptions.filter(p => {
      if (!p.dateFin) return false;
      const days = Math.ceil(
        (new Date(p.dateFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return days <= 7 && days > 0;
    }).length;
  }

  get renewableCount(): number {
    return this.activePrescriptions.filter(
      p => p.renouvelable && p.nombreRenouvellements > 0
    ).length;
  }

  // ========== EVENTS ==========

  viewPrescription(p: Prescription): void {
    this.selectedPrescription = p;
  }

  closeDetails(): void {
    this.selectedPrescription = null;
  }

  onPrescriptionRenewed(renewed: Prescription): void {
    this.selectedPrescription = null;
    this.toastr.success('Prescription renewed successfully.');
    this.loadPrescriptions();
  }

  onPrescriptionCancelled(cancelled: Prescription): void {
    const index = this.allPrescriptions.findIndex(
      p => p.prescriptionId === cancelled.prescriptionId
    );
    if (index !== -1) {
      this.allPrescriptions[index] = cancelled;
      this.splitPrescriptions(this.allPrescriptions);
    }
    this.selectedPrescription = null;
    this.toastr.info('Prescription cancelled.');
  }

  onPdfGenerated(updated: Prescription): void {
    const index = this.allPrescriptions.findIndex(
      p => p.prescriptionId === updated.prescriptionId
    );
    if (index !== -1) {
      this.allPrescriptions[index] = updated;
    }
  }

  goToTab(tab: 'active' | 'today' | 'history'): void {
    const target = tab === 'active' ? '/prescriptions/patient/active' : `/prescriptions/patient/${tab}`;
    this.router.navigate([target]);
  }

  openPrescriptionRoute(prescription: Prescription): void {
    this.router.navigate(['/prescriptions/patient/prescription', prescription.prescriptionId]);
  }

  private applyRouteState(): void {
    const path = this.route.routeConfig?.path || 'patient';
    const prescriptionId = this.route.snapshot.paramMap.get('id');

    if (path.includes('today')) {
      this.activeTab = 'today';
    } else if (path.includes('history')) {
      this.activeTab = 'history';
    } else {
      this.activeTab = 'active';
    }

    if (prescriptionId) {
      this.selectedPrescription = this.allPrescriptions.find(item => item.prescriptionId === prescriptionId) || null;
    }
  }
}
