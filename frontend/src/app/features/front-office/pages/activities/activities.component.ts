import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { AuthService, User } from '../login/auth.service';
import {
  Activity,
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
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.css'],
})
export class ActivitiesComponent implements OnInit, OnDestroy {
  user: User | null = null;
  isLoading = false;

  activities: ActivityView[] = [];
  todayActivities: ActivityView[] = [];
  recommendedActivities: ActivityView[] = [];

  private readonly sub = new Subscription();

  constructor(
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
    private readonly activityService: ActivityService,
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.authService.currentUser$.subscribe((user) => {
        this.user = user;
        const role = String(user?.role || '').toLowerCase();

        if (!user) {
          this.clearActivities();
          return;
        }

        if (role === 'patient' && user.userId) {
          this.loadActivitiesForUser(user.userId);
          return;
        }

        this.loadActivityCatalog();
      }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  getCompletionRate(): number {
    const total = this.todayActivities.length;
    const completed = this.todayActivities.filter((activity) => activity.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  getCompletedTodayCount(): number {
    return this.todayActivities.filter((activity) => activity.completed).length;
  }

  completeActivity(activity: ActivityView, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (activity.completed) {
      return;
    }

    const userId = String(this.user?.userId || '').trim();
    const role = String(this.user?.role || '').toLowerCase();

    if (role !== 'patient' || !userId) {
      this.viewDetails(activity);
      return;
    }

    this.sub.add(
      this.activityService.markCompleted(userId, activity.id).subscribe({
        next: () => {
          activity.completed = true;
          activity.completedAt = new Date().toISOString();
          this.refreshSections();
          this.toastr.success('Activity marked as completed');
        },
        error: () => {
          this.toastr.error('Could not mark this activity as completed');
        },
      }),
    );
  }

  viewDetails(activity: ActivityView): void {
    this.router.navigate(['/activities', activity.id]);
  }

  private loadActivitiesForUser(userId: string): void {
    this.isLoading = true;

    this.sub.add(
      this.activityService.getActivitiesForUser(userId).subscribe({
        next: (activities) => {
          this.activities = (activities || []).map((activity) => this.mapUserActivity(activity));
          this.refreshSections();
          this.isLoading = false;
        },
        error: () => {
          this.clearActivities();
          this.isLoading = false;
          this.toastr.error('Could not load activities');
        },
      }),
    );
  }

  private loadActivityCatalog(): void {
    this.isLoading = true;

    this.sub.add(
      this.activityService.getAllActivities().subscribe({
        next: (activities) => {
          this.activities = (activities || []).map((activity) => this.mapCatalogActivity(activity));
          this.refreshSections();
          this.isLoading = false;
        },
        error: () => {
          this.clearActivities();
          this.isLoading = false;
          this.toastr.error('Could not load activities');
        },
      }),
    );
  }

  private refreshSections(): void {
    const ranked = [...this.activities].sort((left, right) => {
      const leftScore = this.activityPriority(left);
      const rightScore = this.activityPriority(right);
      return rightScore - leftScore;
    });

    this.todayActivities = ranked.slice(0, 4);

    const todayIds = new Set(this.todayActivities.map((activity) => activity.id));
    this.recommendedActivities = ranked.filter((activity) => !todayIds.has(activity.id)).slice(0, 4);
  }

  private activityPriority(activity: ActivityView): number {
    let score = 0;

    if (activity.recommendedByDoctor || activity.doctorSuggested) {
      score += 50;
    }
    if (activity.scheduledTime) {
      score += 20;
    }
    if (!activity.completed) {
      score += 10;
    }

    return score + activity.rating;
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

  private mapCatalogActivity(activity: Activity): ActivityView {
    return {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      duration: Number(activity.duration || 0),
      scheduledTime: activity.scheduledTime,
      description: activity.description,
      instructions: [],
      difficulty: 'Easy',
      recommendedStage: [],
      frequency: 'Flexible',
      supervision: 'Not specified',
      benefits: [],
      precautions: [],
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

  private clearActivities(): void {
    this.activities = [];
    this.todayActivities = [];
    this.recommendedActivities = [];
  }
}
