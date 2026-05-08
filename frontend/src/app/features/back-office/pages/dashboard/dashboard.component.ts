import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { AdminDashboardData, AdminInsightsService, AdminRoleSlice } from '../../../../core/services/admin-insights.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  data: AdminDashboardData | null = null;
  loading = true;
  error = '';

  private refreshSubscription?: Subscription;

  constructor(private adminInsightsService: AdminInsightsService) {}

  ngOnInit(): void {
    this.refreshSubscription = interval(15000)
      .pipe(
        startWith(0),
        switchMap(() => this.adminInsightsService.getDashboardData())
      )
      .subscribe({
        next: (data) => {
          this.data = data;
          this.loading = false;
          this.error = '';
        },
        error: (error) => {
          console.error('Failed to load admin insights', error);
          this.loading = false;
          this.error = 'Unable to load live admin statistics right now.';
        }
      });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  get roleRingStyle(): string {
    if (!this.data?.roleDistribution?.length) {
      return 'conic-gradient(#e5e7eb 0deg 360deg)';
    }

    let current = 0;
    const stops = this.data.roleDistribution.map(slice => {
      const start = current;
      current += slice.percentage * 3.6;
      return `${slice.color} ${start}deg ${current}deg`;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }

  get majorityRole(): AdminRoleSlice | null {
    if (!this.data?.roleDistribution?.length) {
      return null;
    }

    return [...this.data.roleDistribution].sort((left, right) => right.count - left.count)[0];
  }

  getManagedRoleTotal(): number {
    return this.data?.roleDistribution.reduce((sum, slice) => sum + slice.count, 0) || 0;
  }

  buildTrendPath(values: number[], width = 480, height = 220, padding = 22): string {
    if (!values.length) {
      return '';
    }

    const max = Math.max(...values, 1);
    const step = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);

    return values
      .map((value, index) => {
        const x = padding + (step * index);
        const y = height - padding - ((value / max) * (height - padding * 2));
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }

  buildAreaPath(values: number[], width = 480, height = 220, padding = 22): string {
    if (!values.length) {
      return '';
    }

    const linePath = this.buildTrendPath(values, width, height, padding);
    const step = values.length === 1 ? 0 : (width - padding * 2) / (values.length - 1);
    const endX = padding + (step * (values.length - 1));
    const baseY = height - padding;

    return `${linePath} L ${endX} ${baseY} L ${padding} ${baseY} Z`;
  }

  getWeeklySeries(key: 'users' | 'blogs' | 'activities' | 'medicaments'): number[] {
    return this.data?.weeklyTrend.map(point => point[key]) || [];
  }

  getMonthlySeriesMax(): number {
    if (!this.data?.monthlyTrend?.length) {
      return 1;
    }

    return Math.max(
      ...this.data.monthlyTrend.flatMap(point => [point.users, point.blogs, point.activities, point.medicaments]),
      1
    );
  }

  getBarHeight(value: number, max: number): number {
    return max ? Math.max((value / max) * 100, value > 0 ? 8 : 0) : 0;
  }

  formatNumber(value: number | undefined): string {
    return new Intl.NumberFormat().format(value || 0);
  }

  formatCompact(value: number | undefined): string {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
  }

  formatPercent(value: number | undefined): string {
    return `${(value || 0).toFixed(0)}%`;
  }

  formatDateTime(value: string | Date | number[] | undefined): string {
    const date = this.toDate(value);
    if (!date) {
      return 'Unavailable';
    }

    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  relativeTime(value: string | Date | number[] | undefined): string {
    const date = this.toDate(value);
    if (!date) {
      return 'No recent activity';
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

    if (diffMinutes < 1) {
      return 'Just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  private toDate(value?: string | Date | number[]): Date | null {
    if (!value) {
      return null;
    }

    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nano = 0] = value.map(Number);
      if (!year) {
        return null;
      }
      const arrayDate = new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1000000));
      return Number.isNaN(arrayDate.getTime()) ? null : arrayDate;
    }

    if (typeof value === 'string' && /^\d{4},\d{1,2},\d{1,2}/.test(value.trim())) {
      return this.toDate(value.split(',').map(part => Number(part.trim())));
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
