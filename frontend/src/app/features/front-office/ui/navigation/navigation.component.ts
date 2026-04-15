/**
 * NavigationComponent - Main navigation bar for front-office
 * 
 * CHANGED: Fixed severe TypeScript errors caused by duplicate method definitions.
 * The file had multiple copies of the same methods (ngOnInit, getActivityIcon, 
 * getActivityTitle, logout) which caused the class structure to be malformed.
 * 
 * This was a merge conflict issue that resulted in:
 * - Duplicate ngOnInit() methods (lines 71-87 and 88-154 in original)
 * - Duplicate getActivityIcon() methods
 * - Duplicate getActivityTitle() methods  
 * - Duplicate logout() methods
 * 
 * Fixed by removing all duplicate methods and keeping only one correct implementation.
 */
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { NotificationService, Notification as ActivityNotification } from '../../../../core/services/notification.service';
import { DailyTask } from '../../../daily-me/models/daily-task.model';
import { DailyTaskService } from '../../../daily-me/services/daily-task.service';
import { AuthService, User } from '../../pages/login/auth.service';

interface NavItem {
  id: string;
  label: string;
  route: string;
}

interface TaskNotification {
  id: string;
  title: string;
  message: string;
  type: 'task';
  time: string;
  read: boolean;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  taskId?: number | string;
}

@Component({
  selector: 'app-front-office-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css'],
})
export class NavigationComponent implements OnInit, OnDestroy {
  user: User | null = null;
  isMobileMenuOpen = false;
  notificationsOpen = false;
  profileOpen = false;
  bellShaking = false;
  showTaskAlert = false;
  taskAlertTitle = '';
  taskAlertMessage = '';

  activityNotifications: Array<ActivityNotification & { read: boolean }> = [];
  taskNotifications: TaskNotification[] = [];

  private userSub?: Subscription;
  private pollingSub?: Subscription;
  private taskWatcherSub?: Subscription;
  private alertTimer: ReturnType<typeof setTimeout> | null = null;
  private clearedIds = new Set<string>();
  private readonly clearedKey = 'clearedNotificationIds';

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly dailyTaskService: DailyTaskService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) { }

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.user = user;

      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      if (user?.role === 'PATIENT') {
        const patientId = this.getPatientId(user);
        if (patientId) {
          this.startTaskWatcher(patientId);
        }
      } else {
        this.stopTaskWatcher();
      }
    });

    if (this.authService.getToken()) {
      if (!this.authService.getCurrentUserValue()) {
        this.authService.fetchCurrentUser().subscribe({
          error: (err) => {
            if (err.status === 401 && !this.authService.getToken()) {
              this.authService.logout();
            }
          }
        });
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      this.loadClearedIds();
      this.startActivityPolling();
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.pollingSub?.unsubscribe();
    this.taskWatcherSub?.unsubscribe();
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
    }
  }

  get unreadCount(): number {
    return this.activityNotifications.filter((n) => !n.read).length
      + this.taskNotifications.filter((n) => !n.read).length;
  }

  get cognitiveRoute(): string {
    const role = this.user?.role?.trim().toUpperCase();
    return role === 'PATIENT' || role === 'CAREGIVER'
      ? '/cognitive-stimulation'
      : '/cognitive-stimulation/catalog';
  }

  get navItems(): NavItem[] {
    return [
      { id: 'home', label: 'Home', route: '/' },
      { id: 'activities', label: 'Activities', route: '/activities' },
      { id: 'appointments', label: 'Appointments', route: '/appointments' },
      { id: 'prescriptions', label: 'Prescriptions', route: '/prescriptions' },
      { id: 'medical-record', label: 'Medical Record', route: '/medical-record' },
      { id: 'cognitive-stimulation', label: 'Cognitive Care', route: this.cognitiveRoute },
      { id: 'alerts', label: 'Alerts', route: '/alerts' },
      { id: 'daily-me', label: 'Daily Me', route: '/daily-me' },
      { id: 'communication', label: 'Messages', route: '/communication' },
    ];
  }

  isActive(route: string): boolean {
    if (route === '/') {
      return this.router.url === '/';
    }

    return this.router.url === route
      || this.router.url.startsWith(`${route}/`)
      || this.router.url.startsWith(`${route}?`);
  }

  navigate(route: string): void {
    const protectedRoutes = [
      '/activities',
      '/appointments',
      '/prescriptions',
      '/medical-record',
      '/cognitive-stimulation',
      '/alerts',
      '/profile',
      '/communication',
      '/daily-me',
    ];

    if (protectedRoutes.includes(route) && !this.user) {
      this.router.navigateByUrl('/login');
    } else {
      this.router.navigateByUrl(route);
    }

    this.isMobileMenuOpen = false;
    this.profileOpen = false;
    this.notificationsOpen = false;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  openAlerts(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.profileOpen = false;
    }
  }

  toggleProfileMenu(): void {
    this.profileOpen = !this.profileOpen;
    if (this.profileOpen) {
      this.notificationsOpen = false;
    }
  }

  markAllAsRead(): void {
    this.activityNotifications = this.activityNotifications.map((n) => ({ ...n, read: true }));
    this.taskNotifications = this.taskNotifications.map((n) => ({ ...n, read: true }));
  }

  clearAllNotifications(): void {
    this.activityNotifications.forEach((n) => this.clearedIds.add(n.id));
    this.saveClearedIds();
    this.activityNotifications = [];
    this.taskNotifications = [];
  }

  handleActivityNotificationClick(notification: ActivityNotification & { read: boolean }): void {
    this.activityNotifications = this.activityNotifications.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n,
    );
    this.navigate(`/activities/${notification.activityId}`);
  }

  handleTaskNotificationClick(notification: TaskNotification): void {
    this.taskNotifications = this.taskNotifications.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n,
    );
    this.navigate('/daily-me');
  }

  getActivityIcon(action: string): string {
    switch (action) {
      case 'EVICARE_ALERT':
        return '🤖';
      case 'CREATED':
        return '🆕';
      case 'UPDATED':
        return '✏️';
      case 'DELETED':
        return '🗑️';
      default:
        return '📢';
    }
  }

  getActivityTitle(action: string): string {
    switch (action) {
      case 'EVICARE_ALERT':
        return 'EviCare prevention alert';
      case 'CREATED':
        return 'New activity available';
      case 'UPDATED':
        return 'Activity updated';
      case 'DELETED':
        return 'Activity removed';
      default:
        return 'Activity notification';
    }
  }

  getInitials(name: string | undefined): string {
    if (!name) {
      return 'U';
    }

    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  logout(): void {
    this.profileOpen = false;
    const user = this.authService.getCurrentUserValue();
    const isPatient = user?.role === 'PATIENT';
    this.authService.logout(isPatient);
  }

  goToProfile(): void {
    this.profileOpen = false;
    this.navigate('/profile');
  }

  closeTaskAlert(): void {
    this.showTaskAlert = false;
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
  }

  protected getSeverityClasses(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#FDE2E7] text-[#C06C84]';
      case 'HIGH':
        return 'bg-[#FCE7F3] text-[#BE185D]';
      case 'MEDIUM':
        return 'bg-[#EDE9FE] text-[#7C3AED]';
      case 'LOW':
        return 'bg-[#DCFCE7] text-[#15803D]';
      default:
        return 'bg-[#F3F4F6] text-[#6B7280]';
    }
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement): void {
    const dropdown = document.getElementById('profile-dropdown');
    const button = document.getElementById('profile-button');
    const alertsPanel = document.getElementById('notifications-dropdown');
    const alertsButton = document.getElementById('notifications-button');

    if (dropdown && button && !dropdown.contains(target) && !button.contains(target)) {
      this.profileOpen = false;
    }

    if (alertsPanel && alertsButton && !alertsPanel.contains(target) && !alertsButton.contains(target)) {
      this.notificationsOpen = false;
    }
  }

  private startActivityPolling(): void {
    this.fetchActivityNotifications();

    this.pollingSub?.unsubscribe();
    this.pollingSub = interval(10000)
      .pipe(switchMap(() => this.notificationService.getNotifications()))
      .subscribe({
        next: (notifications) => this.mergeActivityNotifications(notifications),
        error: (err) => console.error('Failed to fetch notifications', err),
      });
  }

  private fetchActivityNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => this.mergeActivityNotifications(notifications),
      error: (err) => console.error('Initial notification fetch failed', err),
    });
  }

  private mergeActivityNotifications(notifications: ActivityNotification[]): void {
    const filtered = notifications.filter((n) => !this.clearedIds.has(n.id));
    const existingMap = new Map(this.activityNotifications.map((n) => [n.id, n.read]));

    const merged = filtered.map((n) => ({
      ...n,
      read: existingMap.get(n.id) ?? false,
    }));

    const previousIds = new Set(this.activityNotifications.map((n) => n.id));
    const hasNewItems = merged.some((n) => !previousIds.has(n.id));

    this.activityNotifications = merged;
    if (hasNewItems) {
      this.shakeBell();
    }
  }

  private loadClearedIds(): void {
    try {
      const stored = localStorage.getItem(this.clearedKey);
      if (!stored) {
        return;
      }

      this.clearedIds = new Set(JSON.parse(stored) as string[]);
    } catch {
      this.clearedIds = new Set<string>();
    }
  }

  private saveClearedIds(): void {
    try {
      localStorage.setItem(this.clearedKey, JSON.stringify([...this.clearedIds]));
    } catch {
      console.error('Failed to persist cleared notification IDs');
    }
  }

  private shakeBell(): void {
    this.bellShaking = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.bellShaking = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.bellShaking = false;
        this.cdr.detectChanges();
      }, 800);
    }, 10);
  }

  private getPatientId(user: User): string | null {
    const candidate = (user as User & {
      id?: string;
      patientId?: string;
      username?: string;
      _id?: string;
    }).id
      ?? user.userId
      ?? (user as User & { patientId?: string }).patientId
      ?? (user as User & { _id?: string })._id
      ?? (user as User & { username?: string }).username
      ?? user.email
      ?? null;

    return candidate ? String(candidate).trim() : null;
  }

  private startTaskWatcher(patientId: string): void {
    this.stopTaskWatcher();

    this.dailyTaskService.getTasksByPatient(patientId).subscribe({
      next: (tasks) => this.checkTasksDue(tasks),
      error: () => undefined,
    });

    this.taskWatcherSub = interval(30000)
      .pipe(switchMap(() => this.dailyTaskService.getTasksByPatient(patientId)))
      .subscribe({
        next: (tasks) => this.checkTasksDue(tasks),
        error: () => undefined,
      });
  }

  private stopTaskWatcher(): void {
    this.taskWatcherSub?.unsubscribe();
    this.taskWatcherSub = undefined;
  }

  private checkTasksDue(tasks: DailyTask[]): void {
    const now = Date.now();
    const windowMs = 60000;

    tasks.forEach((task) => {
      const dueMs = this.getTaskDueMs(task);
      if (!dueMs || Math.abs(dueMs - now) > windowMs) {
        return;
      }

      const dayKey = this.todayKey();
      const uniqueKey = `task_notified_${dayKey}_${task.id}_${task.scheduledTime}`;
      if (localStorage.getItem(uniqueKey) === '1') {
        return;
      }

      localStorage.setItem(uniqueKey, '1');

      const title = (task.title || 'Task').trim();
      const message = `Time to do: ${title}`;

      this.showInstantTaskAlert(title, message);
      this.openTaskAlert(title, message);

      this.taskNotifications = [
        {
          id: crypto.randomUUID(),
          title: 'Task reminder',
          message,
          type: 'task',
          time: 'Just now',
          read: false,
          severity: 'MEDIUM',
          taskId: task.id,
        },
        ...this.taskNotifications,
      ];

      this.shakeBell();
    });
  }

  private getTaskDueMs(task: DailyTask): number | null {
    return this.buildTodayMsFromHHmm(task.scheduledTime);
  }

  private buildTodayMsFromHHmm(hhmm: string): number | null {
    if (!hhmm) {
      return null;
    }

    const [hours, minutes] = hhmm.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  }

  private todayKey(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private showInstantTaskAlert(title: string, body: string): void {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`Task: ${title}`, { body });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    } catch {
      console.log(body);
    }
  }

  private openTaskAlert(title: string, message: string): void {
    this.taskAlertTitle = title;
    this.taskAlertMessage = message;
    this.showTaskAlert = true;

    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
    }

    this.alertTimer = setTimeout(() => {
      this.showTaskAlert = false;
      this.alertTimer = null;
    }, 6000);
  }
}
