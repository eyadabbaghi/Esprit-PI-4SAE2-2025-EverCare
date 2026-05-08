import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Activity, ActivityService } from './activity.service';
import { AdminService, UserAdminDto } from './admin.service';
import { BlogService } from '../../features/blog/pages/blog/services/blog.service';
import { Article, CategoryPerformance } from '../../features/blog/models/blog.model';
import { Medicament, MedicamentAnalyticsSummary } from '../../features/prescription/models/medicament.model';
import { MedicamentService } from '../../features/prescription/services/medicament.service';

type ManagedRole = 'PATIENT' | 'DOCTOR' | 'CAREGIVER';

export interface AdminRoleSlice {
  role: ManagedRole;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AdminTrendPoint {
  label: string;
  users: number;
  blogs: number;
  activities: number;
  medicaments: number;
}

export interface AdminRecentChange {
  id: string;
  area: 'Blog' | 'Activity' | 'Medication';
  action: 'created' | 'updated';
  title: string;
  actorEmail: string;
  actorName: string;
  timestamp: string;
  accent: string;
  description: string;
}

export interface AdminContributor {
  email: string;
  name: string;
  totalActions: number;
  blogActions: number;
  activityActions: number;
  medicationActions: number;
  lastActionAt?: string;
}

export interface AdminDashboardData {
  refreshedAt: Date;
  users: UserAdminDto[];
  articles: Article[];
  activities: Activity[];
  medicaments: Medicament[];
  categoryStats: CategoryPerformance[];
  medicamentSummary: MedicamentAnalyticsSummary;
  totalUsers: number;
  totalAdmins: number;
  totalPatients: number;
  totalDoctors: number;
  totalCaregivers: number;
  activeUsers: number;
  verifiedUsers: number;
  newUsersThisMonth: number;
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
  totalBlogViews: number;
  totalBlogLikes: number;
  avgReadingTime: number;
  totalActivities: number;
  doctorSuggestedActivities: number;
  averageActivityRating: number;
  totalActivityRatings: number;
  totalMedicaments: number;
  activeMedicaments: number;
  inactiveMedicaments: number;
  roleDistribution: AdminRoleSlice[];
  weeklyTrend: AdminTrendPoint[];
  monthlyTrend: AdminTrendPoint[];
  recentChanges: AdminRecentChange[];
  topAdmins: AdminContributor[];
  recentAdmins: UserAdminDto[];
  topArticles: Article[];
  topActivityTypes: Array<{ type: string; count: number }>;
  topLaboratories: Array<{ name: string; count: number }>;
  topCategory?: CategoryPerformance;
}

@Injectable({
  providedIn: 'root'
})
export class AdminInsightsService {
  private readonly rolePalette: Record<ManagedRole, string> = {
    PATIENT: '#2563eb',
    DOCTOR: '#f97316',
    CAREGIVER: '#14b8a6'
  };

  constructor(
    private adminService: AdminService,
    private activityService: ActivityService,
    private blogService: BlogService,
    private medicamentService: MedicamentService
  ) {}

  getDashboardData(): Observable<AdminDashboardData> {
    return forkJoin({
      users: this.adminService.getAllUsers(),
      articles: this.blogService.getAllArticles(),
      categoryStats: this.blogService.getCategoryPerformance(),
      activities: this.activityService.getAllActivities(),
      medicaments: this.medicamentService.getAllMedicaments(),
      medicamentSummary: this.medicamentService.getAnalyticsSummary()
    }).pipe(
      map(({ users, articles, categoryStats, activities, medicaments, medicamentSummary }) =>
        this.buildDashboardData(users, articles, categoryStats, activities, medicaments, medicamentSummary)
      )
    );
  }

  private buildDashboardData(
    users: UserAdminDto[],
    articles: Article[],
    categoryStats: CategoryPerformance[],
    activities: Activity[],
    medicaments: Medicament[],
    medicamentSummary: MedicamentAnalyticsSummary
  ): AdminDashboardData {
    const totalUsers = users.length;
    const totalAdmins = users.filter(user => user.role === 'ADMIN').length;
    const totalPatients = users.filter(user => user.role === 'PATIENT').length;
    const totalDoctors = users.filter(user => user.role === 'DOCTOR').length;
    const totalCaregivers = users.filter(user => user.role === 'CAREGIVER').length;
    const activeUsers = users.filter(user => this.isWithinDays(user.lastSeenAt, 7)).length;
    const verifiedUsers = users.filter(user => !!user.isVerified).length;
    const newUsersThisMonth = users.filter(user => this.isSameMonth(user.createdAt, new Date())).length;

    const totalBlogs = articles.length;
    const publishedBlogs = articles.filter(article => article.isPublished).length;
    const draftBlogs = totalBlogs - publishedBlogs;
    const totalBlogViews = articles.reduce((sum, article) => sum + (article.viewCount || 0), 0);
    const totalBlogLikes = articles.reduce((sum, article) => sum + (article.likeCount || 0), 0);
    const avgReadingTime = totalBlogs
      ? articles.reduce((sum, article) => sum + (article.readingTime || 0), 0) / totalBlogs
      : 0;

    const totalActivities = activities.length;
    const doctorSuggestedActivities = activities.filter(activity => activity.doctorSuggested).length;
    const totalActivityRatings = activities.reduce((sum, activity) => sum + (activity.totalRatings || 0), 0);
    const weightedActivityRatingTotal = activities.reduce(
      (sum, activity) => sum + ((activity.rating || 0) * (activity.totalRatings || 0)),
      0
    );
    const averageActivityRating = totalActivityRatings
      ? weightedActivityRatingTotal / totalActivityRatings
      : 0;

    const roleDistribution = this.buildRoleDistribution(totalPatients, totalDoctors, totalCaregivers);
    const weeklyTrend = this.buildTrendPoints(7, 'day', users, articles, activities, medicaments);
    const monthlyTrend = this.buildTrendPoints(6, 'month', users, articles, activities, medicaments);
    const recentChanges = this.buildRecentChanges(users, articles, activities, medicaments);
    const topAdmins = this.buildTopAdmins(recentChanges);
    const recentAdmins = [...users]
      .filter(user => user.role === 'ADMIN')
      .sort((left, right) => this.getTime(right.lastSeenAt || right.createdAt) - this.getTime(left.lastSeenAt || left.createdAt))
      .slice(0, 5);
    const topArticles = [...articles]
      .sort((left, right) => ((right.viewCount || 0) + (right.likeCount || 0)) - ((left.viewCount || 0) + (left.likeCount || 0)))
      .slice(0, 5);
    const topActivityTypes = this.groupCount(
      activities.map(activity => activity.type || 'Uncategorized'),
      4,
      'type'
    ) as Array<{ type: string; count: number }>;
    const topLaboratories = this.groupCount(
      medicaments.map(medicament => medicament.laboratoire || 'Unknown lab'),
      4,
      'name'
    ) as Array<{ name: string; count: number }>;

    return {
      refreshedAt: new Date(),
      users,
      articles,
      activities,
      medicaments,
      categoryStats,
      medicamentSummary,
      totalUsers,
      totalAdmins,
      totalPatients,
      totalDoctors,
      totalCaregivers,
      activeUsers,
      verifiedUsers,
      newUsersThisMonth,
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      totalBlogViews,
      totalBlogLikes,
      avgReadingTime,
      totalActivities,
      doctorSuggestedActivities,
      averageActivityRating,
      totalActivityRatings,
      totalMedicaments: medicamentSummary.totalMedicaments,
      activeMedicaments: medicamentSummary.activeMedicaments,
      inactiveMedicaments: medicamentSummary.inactiveMedicaments,
      roleDistribution,
      weeklyTrend,
      monthlyTrend,
      recentChanges,
      topAdmins,
      recentAdmins,
      topArticles,
      topActivityTypes,
      topLaboratories,
      topCategory: [...categoryStats].sort((left, right) => (right.totalViews || 0) - (left.totalViews || 0))[0]
    };
  }

  private buildRoleDistribution(totalPatients: number, totalDoctors: number, totalCaregivers: number): AdminRoleSlice[] {
    const totalManagedUsers = totalPatients + totalDoctors + totalCaregivers;
    return ([
      { role: 'PATIENT', label: 'Patients', count: totalPatients },
      { role: 'DOCTOR', label: 'Doctors', count: totalDoctors },
      { role: 'CAREGIVER', label: 'Caregivers', count: totalCaregivers }
    ] as const).map(slice => ({
      ...slice,
      color: this.rolePalette[slice.role],
      percentage: totalManagedUsers ? (slice.count / totalManagedUsers) * 100 : 0
    }));
  }

  private buildTrendPoints(
    periods: number,
    unit: 'day' | 'month',
    users: UserAdminDto[],
    articles: Article[],
    activities: Activity[],
    medicaments: Medicament[]
  ): AdminTrendPoint[] {
    const now = new Date();
    const points: AdminTrendPoint[] = [];

    for (let index = periods - 1; index >= 0; index -= 1) {
      const start = new Date(now);
      const end = new Date(now);

      if (unit === 'day') {
        start.setDate(now.getDate() - index);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - index);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setMonth(now.getMonth() - index, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth() - index + 1, 0);
        end.setHours(23, 59, 59, 999);
      }

      points.push({
        label: unit === 'day'
          ? start.toLocaleDateString(undefined, { weekday: 'short' })
          : start.toLocaleDateString(undefined, { month: 'short' }),
        users: users.filter(user => this.isBetween(user.createdAt, start, end)).length,
        blogs: articles.filter(article => this.isBetween(article.createdAt, start, end)).length,
        activities: activities.filter(activity => this.isBetween(activity.createdAt, start, end)).length,
        medicaments: medicaments.filter(medicament => this.isBetween(medicament.createdAt, start, end)).length
      });
    }

    return points;
  }

  private buildRecentChanges(
    users: UserAdminDto[],
    articles: Article[],
    activities: Activity[],
    medicaments: Medicament[]
  ): AdminRecentChange[] {
    const userMap = new Map(users.map(user => [user.email?.toLowerCase(), user]));
    const changes: AdminRecentChange[] = [];

    articles.forEach(article => {
      if (article.createdAt && article.authorEmail) {
        changes.push(this.createChange(
          `blog-created-${article.id}`,
          'Blog',
          'created',
          article.title,
          article.authorEmail,
          article.createdAt,
          userMap,
          '#ec4899'
        ));
      }
      if (article.lastUpdated && article.lastModifiedByEmail && !this.isSameMoment(article.createdAt, article.lastUpdated)) {
        changes.push(this.createChange(
          `blog-updated-${article.id}`,
          'Blog',
          'updated',
          article.title,
          article.lastModifiedByEmail,
          article.lastUpdated,
          userMap,
          '#8b5cf6'
        ));
      }
    });

    activities.forEach(activity => {
      if (activity.createdAt && activity.createdBy) {
        changes.push(this.createChange(
          `activity-created-${activity.id}`,
          'Activity',
          'created',
          activity.name,
          activity.createdBy,
          activity.createdAt,
          userMap,
          '#14b8a6'
        ));
      }
      if (activity.lastUpdated && activity.updatedBy && !this.isSameMoment(activity.createdAt, activity.lastUpdated)) {
        changes.push(this.createChange(
          `activity-updated-${activity.id}`,
          'Activity',
          'updated',
          activity.name,
          activity.updatedBy,
          activity.lastUpdated,
          userMap,
          '#0ea5e9'
        ));
      }
    });

    medicaments.forEach(medicament => {
      if (medicament.createdAt && medicament.createdBy) {
        changes.push(this.createChange(
          `medication-created-${medicament.medicamentId}`,
          'Medication',
          'created',
          medicament.nomCommercial,
          medicament.createdBy,
          medicament.createdAt,
          userMap,
          '#f97316'
        ));
      }
      if (medicament.updatedAt && medicament.updatedBy && !this.isSameMoment(medicament.createdAt, medicament.updatedAt)) {
        changes.push(this.createChange(
          `medication-updated-${medicament.medicamentId}`,
          'Medication',
          'updated',
          medicament.nomCommercial,
          medicament.updatedBy,
          medicament.updatedAt,
          userMap,
          '#f59e0b'
        ));
      }
    });

    return changes
      .sort((left, right) => this.getTime(right.timestamp) - this.getTime(left.timestamp))
      .slice(0, 12);
  }

  private buildTopAdmins(changes: AdminRecentChange[]): AdminContributor[] {
    const grouped = new Map<string, AdminContributor>();

    changes.forEach(change => {
      if (!change.actorEmail || change.actorEmail === 'anonymous') {
        return;
      }

      const existing = grouped.get(change.actorEmail) || {
        email: change.actorEmail,
        name: change.actorName,
        totalActions: 0,
        blogActions: 0,
        activityActions: 0,
        medicationActions: 0,
        lastActionAt: change.timestamp
      };

      existing.totalActions += 1;
      existing.lastActionAt = this.getTime(change.timestamp) > this.getTime(existing.lastActionAt)
        ? change.timestamp
        : existing.lastActionAt;

      if (change.area === 'Blog') {
        existing.blogActions += 1;
      } else if (change.area === 'Activity') {
        existing.activityActions += 1;
      } else {
        existing.medicationActions += 1;
      }

      grouped.set(change.actorEmail, existing);
    });

    return [...grouped.values()]
      .sort((left, right) => right.totalActions - left.totalActions || this.getTime(right.lastActionAt) - this.getTime(left.lastActionAt))
      .slice(0, 5);
  }

  private createChange(
    id: string,
    area: 'Blog' | 'Activity' | 'Medication',
    action: 'created' | 'updated',
    title: string,
    actorEmail: string,
    timestamp: string | Date,
    userMap: Map<string | undefined, UserAdminDto>,
    accent: string
  ): AdminRecentChange {
    const actor = userMap.get(actorEmail?.toLowerCase());
    const actorName = actor?.name || this.formatActorName(actorEmail);
    return {
      id,
      area,
      action,
      title,
      actorEmail,
      actorName,
      timestamp: typeof timestamp === 'string' ? timestamp : timestamp.toISOString(),
      accent,
      description: `${actorName} ${action} ${area.toLowerCase()} "${title}".`
    };
  }

  private groupCount(values: string[], limit: number, key: 'type' | 'name'): Array<{ [value: string]: string | number }> {
    const counts = new Map<string, number>();
    values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([label, count]) => ({ [key]: label, count }));
  }

  private formatActorName(actorEmail: string): string {
    if (!actorEmail || actorEmail === 'anonymous') {
      return 'Unknown admin';
    }
    const base = actorEmail.split('@')[0] || actorEmail;
    return base
      .split(/[._-]/g)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private isWithinDays(value: string | Date | number[] | undefined, days: number): boolean {
    if (!value) {
      return false;
    }

    const date = this.toDate(value);
    if (!date) {
      return false;
    }

    const diffMs = Date.now() - date.getTime();
    return diffMs <= days * 24 * 60 * 60 * 1000;
  }

  private isSameMonth(value: string | Date | number[] | undefined, current: Date): boolean {
    const date = this.toDate(value);
    return !!date && date.getMonth() === current.getMonth() && date.getFullYear() === current.getFullYear();
  }

  private isBetween(value: string | Date | number[] | undefined, start: Date, end: Date): boolean {
    const date = this.toDate(value);
    return !!date && date >= start && date <= end;
  }

  private isSameMoment(left?: string | Date | number[], right?: string | Date | number[]): boolean {
    return this.getTime(left) === this.getTime(right);
  }

  private getTime(value?: string | Date | number[]): number {
    return this.toDate(value)?.getTime() || 0;
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
