import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AlertsService } from '../../core/services/alerts.service';
import { EvercareRuntimeService } from '../../core/services/evercare-runtime.service';
import { UserService } from '../../core/services/user.service';
import { AuthService, User } from '../../features/front-office/pages/login/auth.service';

@Component({
  selector: 'app-front-office-layout',
  templateUrl: './front-office-layout.component.html',
  styleUrl: './front-office-layout.component.css'
})
export class FrontOfficeLayoutComponent implements OnInit, OnDestroy {
  user: User | null = null;
  patientCheckCaregiverId = '';
  private userSub?: Subscription;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly alertsService: AlertsService,
    private readonly userService: UserService,
    private readonly evercareRuntime: EvercareRuntimeService
  ) {}

  ngOnInit(): void {
    this.evercareRuntime.start();
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.user = user;
      this.patientCheckCaregiverId = '';
      const caregiverEmail = user?.role === 'PATIENT' ? user.caregiverEmails?.[0] : '';
      if (caregiverEmail) {
        this.userService.getUserByEmail(caregiverEmail).subscribe({
          next: caregiver => this.patientCheckCaregiverId = caregiver.userId,
          error: () => this.patientCheckCaregiverId = ''
        });
      }
    });
  }

  get hideNavigation(): boolean {
    const url = this.router.url;
    return url.includes('/login') || url.includes('/register');
  }

  get showPatientCheckReceiver(): boolean {
    return !this.hideNavigation && this.user?.role === 'PATIENT' && !!this.user.userId && !!this.patientCheckCaregiverId;
  }

  get showGlobalAlertAlarm(): boolean {
    return !this.hideNavigation && this.user?.role === 'PATIENT';
  }

  resolveGlobalAlert(alertId: string): void {
    this.alertsService.resolveAlert(alertId).subscribe({
      next: () => this.evercareRuntime.refreshNow(),
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }
}
