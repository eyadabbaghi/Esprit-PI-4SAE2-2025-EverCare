import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AuthService, User } from '../login/auth.service';
import { ActivityService, Activity } from '../../../../core/services/activity.service';
import { UserService, Patient } from '../../../../core/services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-doctor-activities',
  templateUrl: './doctor-activities.component.html',
})
export class DoctorActivitiesComponent implements OnInit {
  doctor: User | null = null;
  patients: Patient[] = [];
  activities: Activity[] = [];
  recommending = new Set<string>();

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user?.role === 'DOCTOR') {
        this.doctor = user;
        this.loadPatients();
        this.loadActivities();
      }
    });
  }

  loadPatients(): void {
    if (!this.doctor?.patientEmails?.length) return;
    forkJoin(this.doctor.patientEmails.map(email => this.userService.getUserByEmail(email)))
      .subscribe(patients => this.patients = patients);
  }

  loadActivities(): void {
    this.activityService.getAllActivities().subscribe(acts => this.activities = acts);
  }

  recommend(activity: Activity, patientId: string): void {
  // Ensure doctor and patient are selected, and doctor has a valid userId
  if (!this.doctor?.userId || !patientId) return;
  if (this.recommending.has(activity.id)) return; // prevent double clicks

  this.recommending.add(activity.id);
  this.activityService.recommendActivity(this.doctor.userId, patientId, activity.id).subscribe({
    next: () => {
      this.toastr.success('Activity recommended');
      this.recommending.delete(activity.id);
    },
    error: () => {
      this.toastr.error('Recommendation failed');
      this.recommending.delete(activity.id);
    }
  });
}

  getImageUrl(relativePath: string): string {
    return relativePath ? `${this.activityService.apiUrl}${relativePath}` : '/assets/logo.png';
  }
}