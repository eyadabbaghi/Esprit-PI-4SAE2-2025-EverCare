import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../front-office/pages/login/auth.service';

@Component({
  selector: 'app-user-prescriptions',
  template: `
    <div *ngIf="loading" class="flex items-center justify-center min-h-screen">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#7C3AED]"></div>
    </div>
  `
})
export class UserPrescriptionsComponent implements OnInit {
  loading = true;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }

      switch (user.role) {
        case 'DOCTOR':
          this.router.navigate(['/prescriptions/doctor']);
          break;
        case 'PATIENT':
          this.router.navigate(['/prescriptions/patient']);
          break;
        case 'CAREGIVER':
          this.router.navigate(['/prescriptions/caregiver']);
          break;
        default:
          this.router.navigate(['/home']);
          break;
      }
    });
  }
}
