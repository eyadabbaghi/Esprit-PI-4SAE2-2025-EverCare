import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService, User } from '../login/auth.service';
import {
  Activity,
  ActivityDetails,
  ActivityService,
  ActivityWithUserData,
} from '../../../../core/services/activity.service';

type DifficultyLevel = 'Easy' | 'Moderate' | 'Challenging';
type AlzheimerStage = 'Early' | 'Moderate' | 'Advanced';

interface ActivityView {
  id: string;
  name: string;
  type: string;
  duration: number;
  scheduledTime?: string;
  description: string;
  instructions: string[];
  difficulty: DifficultyLevel;
  recommendedStage: AlzheimerStage[];
  frequency: string;
  supervision: string;
  benefits: string[];
  precautions?: string[];
  completed: boolean;
  favorite: boolean;
  doctorSuggested?: boolean;
  recommendedByDoctor?: boolean;
  doctorName?: string;
  completedAt?: string;
  imageUrl: string;
  rating: number;
  totalRatings: number;
  userRating: number | null;
}

@Component({
  selector: 'app-activity-details',
  templateUrl: './activity-details.component.html',
  styleUrls: ['./activity-details.component.css'],
})
export class ActivityDetailsComponent implements OnInit, OnDestroy {
  activity: ActivityView | null = null;
  userRating = 0;

  private user: User | null = null;
  private readonly sub = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
    private readonly activityService: ActivityService,
  ) {}

  ngOnInit(): void {
    const activityId = this.route.snapshot.paramMap.get('id');
    if (!activityId) {
      this.router.navigate(['/activities']);
      return;
    }

    this.sub.add(
      this.authService.currentUser$.subscribe((user) => {
        this.user = user;
        this.loadActivity(activityId);
      }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  backToList(): void {
    this.router.navigate(['/activities']);
  }

  rate(rating: number): void {
    if (!this.activity) {
      return;
    }

    const userId = String(this.user?.userId || '').trim();
    const role = String(this.user?.role || '').toLowerCase();

    if (!userId || role !== 'patient') {
      this.toastr.info('Only patients can rate activities from this page');
      return;
    }

    this.sub.add(
      this.activityService.rateActivity(userId, this.activity.id, rating).subscribe({
        next: () => {
          this.userRating = rating;
          this.activity = {
            ...this.activity!,
            rating:
              (this.activity!.rating * this.activity!.totalRatings + rating) /
              (this.activity!.totalRatings + 1),
            totalRatings: this.activity!.totalRatings + 1,
            userRating: rating,
          };
          this.toastr.success(`You rated this activity ${rating} star${rating !== 1 ? 's' : ''}`);
        },
        error: () => {
          this.toastr.error('Could not submit your rating');
        },
      }),
    );
  }

  private loadActivity(activityId: string): void {
    const userId = String(this.user?.userId || '').trim();
    const role = String(this.user?.role || '').toLowerCase();

    if (role === 'patient' && userId) {
      this.loadPatientActivity(userId, activityId);
      return;
    }

    this.loadCatalogActivity(activityId);
  }

  private loadPatientActivity(userId: string, activityId: string): void {
    this.sub.add(
      this.activityService.getActivityForUser(userId, activityId).subscribe({
        next: (activity) => {
          this.activity = this.mapUserActivity(activity);
          this.userRating = activity.userRating ?? 0;
        },
        error: () => {
          this.toastr.error('Activity not found');
          this.router.navigate(['/activities']);
        },
      }),
    );
  }

  private loadCatalogActivity(activityId: string): void {
    this.sub.add(
      forkJoin({
        activity: this.activityService.getActivityById(activityId),
        details: this.activityService.getDetailsByActivityId(activityId),
      }).subscribe({
        next: ({ activity, details }) => {
          this.activity = this.mapCatalogActivity(activity, details[0]);
          this.userRating = 0;
        },
        error: () => {
          this.toastr.error('Activity not found');
          this.router.navigate(['/activities']);
        },
      }),
    );
  }

  private mapUserActivity(activity: ActivityWithUserData): ActivityView {
    return {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      duration: Number(activity.duration || 0),
      scheduledTime: activity.scheduledTime,
      description: activity.description,
      instructions: activity.instructions || [],
      difficulty: activity.difficulty || 'Easy',
      recommendedStage: activity.recommendedStage || [],
      frequency: activity.frequency || 'Not specified',
      supervision: activity.supervision || 'Not specified',
      benefits: activity.benefits || [],
      precautions: activity.precautions || [],
      completed: !!activity.completed,
      favorite: !!activity.favorite,
      doctorSuggested: !!activity.doctorSuggested,
      recommendedByDoctor: !!activity.recommendedByDoctor,
      doctorName: activity.doctorName,
      completedAt: activity.completedAt,
      imageUrl: this.resolveImageUrl(activity.imageUrl),
      rating: Number(activity.rating || 0),
      totalRatings: Number(activity.totalRatings || 0),
      userRating: activity.userRating ?? null,
    };
  }

  private mapCatalogActivity(activity: Activity, details?: ActivityDetails): ActivityView {
    return {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      duration: Number(activity.duration || 0),
      scheduledTime: activity.scheduledTime,
      description: activity.description,
      instructions: details?.instructions || [],
      difficulty: details?.difficulty || 'Easy',
      recommendedStage: details?.recommendedStage || [],
      frequency: details?.frequency || 'Flexible',
      supervision: details?.supervision || 'Not specified',
      benefits: details?.benefits || [],
      precautions: details?.precautions || [],
      completed: false,
      favorite: false,
      doctorSuggested: !!activity.doctorSuggested,
      recommendedByDoctor: false,
      doctorName: undefined,
      completedAt: undefined,
      imageUrl: this.resolveImageUrl(activity.imageUrl),
      rating: Number(activity.rating || 0),
      totalRatings: Number(activity.totalRatings || 0),
      userRating: null,
    };
  }

  private resolveImageUrl(imageUrl?: string): string {
    const value = String(imageUrl || '').trim();
    if (!value) {
      return '/assets/logo.png';
    }

    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('/assets/')
    ) {
      return value;
    }

    return `${this.activityService.apiUrl}${value.startsWith('/') ? value : `/${value}`}`;
  }
}
