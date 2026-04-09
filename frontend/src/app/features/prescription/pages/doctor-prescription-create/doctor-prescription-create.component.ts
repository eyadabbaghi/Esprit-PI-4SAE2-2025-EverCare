import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { PrescriptionRequest } from '../../models/prescription.model';
import { PrescriptionService } from '../../services/prescription.service';

@Component({
  selector: 'app-doctor-prescription-create',
  templateUrl: './doctor-prescription-create.component.html'
})
export class DoctorPrescriptionCreateComponent implements OnInit {
  currentUser: User | null = null;
  patientId = '';
  appointmentId = '';
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private prescriptionService: PrescriptionService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.patientId = params.get('patientId') || '';
      this.appointmentId = params.get('appointmentId') || '';
    });

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
    });
  }

  submit(request: PrescriptionRequest): void {
    this.loading = true;
    this.errorMessage = '';

    this.prescriptionService.createPrescription(request).subscribe({
      next: () => {
        this.loading = false;
        this.toastr.success('Prescription issued successfully.');
        this.router.navigate(['/prescriptions/doctor/manage']);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Failed to issue prescription.';
      }
    });
  }

  goBack(): void {
    if (this.appointmentId) {
      this.router.navigate(['/appointments/doctor']);
      return;
    }

    this.router.navigate(['/prescriptions/doctor/manage']);
  }
}
