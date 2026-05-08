import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { AdminDashboardData, AdminInsightsService } from '../../../../core/services/admin-insights.service';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  data: AdminDashboardData | null = null;
  loading = true;

  private refreshSubscription?: Subscription;

  constructor(private adminInsightsService: AdminInsightsService) {}

  ngOnInit(): void {
    this.refreshSubscription = interval(20000)
      .pipe(
        startWith(0),
        switchMap(() => this.adminInsightsService.getDashboardData())
      )
      .subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load analytics', error);
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  get verificationRate(): number {
    if (!this.data?.totalUsers) {
      return 0;
    }

    return (this.data.verifiedUsers / this.data.totalUsers) * 100;
  }

  get activityQualityScore(): number {
    if (!this.data?.totalActivities) {
      return 0;
    }

    const ratingWeight = Math.min((this.data.averageActivityRating / 5) * 100, 100);
    const recommendationWeight = (this.data.doctorSuggestedActivities / this.data.totalActivities) * 100;
    return (ratingWeight * 0.65) + (recommendationWeight * 0.35);
  }

  get contentEngagementScore(): number {
    if (!this.data?.totalBlogs) {
      return 0;
    }

    const averageViews = this.data.totalBlogViews / this.data.totalBlogs;
    const averageLikes = this.data.totalBlogLikes / this.data.totalBlogs;
    return Math.min((averageViews * 0.6) + (averageLikes * 7), 100);
  }

  getMonthlyMax(): number {
    if (!this.data?.monthlyTrend?.length) {
      return 1;
    }

    return Math.max(
      ...this.data.monthlyTrend.flatMap(point => [point.users, point.blogs, point.activities, point.medicaments]),
      1
    );
  }

  get topActivityHighlight(): { type: string; count: number } | null {
    return this.data?.topActivityTypes?.[0] || null;
  }

  get topLaboratoryHighlight(): { name: string; count: number } | null {
    return this.data?.topLaboratories?.[0] || null;
  }

  getBarHeight(value: number, max: number): number {
    return max ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;
  }

  formatNumber(value: number | undefined): string {
    return new Intl.NumberFormat().format(value || 0);
  }

  formatPercent(value: number | undefined): string {
    return `${(value || 0).toFixed(0)}%`;
  }

  formatCompact(value: number | undefined): string {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
  }
}
