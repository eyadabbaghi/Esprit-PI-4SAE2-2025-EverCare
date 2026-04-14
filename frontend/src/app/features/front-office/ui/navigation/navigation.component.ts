import { Component, HostListener, OnDestroy, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService, User } from '../../pages/login/auth.service';
import { NotificationService, Notification as ActivityNotification } from '../../../../core/services/notification.service';
import { DailyTaskService } from '../../../daily-me/services/daily-task.service';
import { DailyTask } from '../../../daily-me/models/daily-task.model';

interface NavItem {
  id: string;
  label: string;
  route: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'appointment' | 'medication' | 'message' | 'task';
  time: string;
  read: boolean;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
  navItems: NavItem[] = [
    { id: 'home', label: 'Home', route: '/' },
    { id: 'activities', label: 'Activities', route: '/activities' },
    { id: 'appointments', label: 'Appointments', route: '/appointments' },
    { id: 'pres', label: 'pres', route: '/prescriptions' },
    { id: 'medical-folder', label: 'Medical Folder', route: '/medical-folder' },
    { id: 'alerts', label: 'Alerts', route: '/alerts' },
    { id: 'daily', label: 'Daily Me', route: '/daily-me' },
    { id: 'communication', label: 'Messages', route: '/communication' },
  ];

  user: User | null = null;
  private userSub!: Subscription;
  private pollingSub!: Subscription;
  private taskWatcherSub!: Subscription;
  private clearedIds = new Set<string>();
  private readonly CLEARED_KEY = 'clearedNotificationIds';

  isMobileMenuOpen = false;
  notificationsOpen = false;
  profileOpen = false;
  bellShaking = false;

  // Task alert properties
  showTaskAlert = false;
  taskAlertTitle = '';
  taskAlertMessage = '';
  private alertTimer: any = null;

  // Activity notifications (exactly as before)
  activityNotifications: (ActivityNotification & { read: boolean })[] = [];

  // Task notifications (separate array)
  taskNotifications: TaskNotification[] = [];

  constructor(
    private readonly router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private dailyTaskService: DailyTaskService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.user = user;

      // Start task watcher when user is available
      if (user && user.role === 'PATIENT' && isPlatformBrowser(this.platformId)) {
        const patientId = this.getPatientId(user);
        if (patientId) {
          this.startTaskWatcher(patientId);
        }
      } else if (this.taskWatcherSub) {
        this.taskWatcherSub.unsubscribe();
      }
    });

    if (this.authService.getToken()) {
      this.authService.fetchCurrentUser().subscribe({
        error: () => this.authService.logout()
      });
    }

    if (isPlatformBrowser(this.platformId)) {
      this.loadClearedIds();

      // Activity notifications polling (exactly as before)
      this.notificationService.getNotifications().subscribe({
        next: (data) => {
          this.activityNotifications = data
            .filter(n => !this.clearedIds.has(n.id))
            .map(n => ({ ...n, read: false }));
        },
        error: (err) => console.error('Initial notification fetch failed', err)
      });

      this.pollingSub = interval(10000)
        .pipe(switchMap(() => this.notificationService.getNotifications()))
        .subscribe({
          next: (fetched) => {
            const filtered = fetched.filter(n => !this.clearedIds.has(n.id));
            const existingIds = new Set(this.activityNotifications.map(n => n.id));
            const existingMap = new Map(this.activityNotifications.map(n => [n.id, n]));

            const merged = filtered.map(n => ({
              ...n,
              read: existingIds.has(n.id) ? (existingMap.get(n.id)?.read ?? false) : false
            }));

            const hasNewItems = filtered.some(n => !existingIds.has(n.id));
            const hasRemovedItems = this.activityNotifications.some(n => !filtered.find(f => f.id === n.id));

            if (hasNewItems || hasRemovedItems) {
              this.activityNotifications = merged;
              if (hasNewItems) {
                this.shakeBell();
              }
            }
          },
          error: (err) => console.error('Failed to fetch notifications', err)
        });
    }
  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
    if (this.pollingSub) this.pollingSub.unsubscribe();
    if (this.taskWatcherSub) this.taskWatcherSub.unsubscribe();
    if (this.alertTimer) clearTimeout(this.alertTimer);
  }

  // ==================== Activity Notification Methods (exactly as before) ====================

  private loadClearedIds(): void {
    try {
      const stored = localStorage.getItem(this.CLEARED_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        this.clearedIds = new Set(ids);
      }
    } catch {
      this.clearedIds = new Set();
    }
  }

  private saveClearedIds(): void {
    try {
      localStorage.setItem(this.CLEARED_KEY, JSON.stringify([...this.clearedIds]));
    } catch {
      console.error('Failed to persist cleared notification IDs');
    }
  }

  shakeBell(): void {
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

  get unreadCount(): number {
    return this.activityNotifications.filter(n => !n.read).length +
      this.taskNotifications.filter(n => !n.read).length;
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
      { id: 'medical-record', label: 'Medical Record', route: '/medical-record' },
      { id: 'cognitive-stimulation', label: 'Cognitive Care', route: this.cognitiveRoute },
      { id: 'alerts', label: 'Alerts', route: '/alerts' },
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
      '/activities', '/appointments', '/medical-folder', '/alerts',
      '/profile', '/messages', '/daily', '/blog'
    ];
    if (protectedRoutes.includes(route) && !this.user) {
      this.router.navigateByUrl('/login');
    } else {
      this.router.navigateByUrl(route);
    }
    this.isMobileMenuOpen = false;
    this.profileOpen = false;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  openAlerts(): void {
    this.notificationsOpen = !this.notificationsOpen;
  }

  toggleProfileMenu(): void {
    this.profileOpen = !this.profileOpen;
  }

  markAllAsRead(): void {
    this.activityNotifications = this.activityNotifications.map(n => ({ ...n, read: true }));
    this.taskNotifications = this.taskNotifications.map(n => ({ ...n, read: true }));
  }

  markActivityAsRead(id: string): void {
    this.activityNotifications = this.activityNotifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
  }

  markTaskAsRead(id: string): void {
    this.taskNotifications = this.taskNotifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
  }

  handleActivityNotificationClick(notification: ActivityNotification & { read: boolean }): void {
    this.markActivityAsRead(notification.id);
    this.navigate(`/activities/${notification.activityId}`);
  }

  handleTaskNotificationClick(notification: TaskNotification): void {
    this.markTaskAsRead(notification.id);
    this.navigate('/daily-me');
  }

  clearAllNotifications(): void {
    this.activityNotifications.forEach(n => this.clearedIds.add(n.id));
    this.saveClearedIds();
    this.activityNotifications = [];
    this.taskNotifications = [];
  }

  getActivityIcon(action: string): string {
    switch (action) {
      case 'CREATED': return '🆕';
      case 'UPDATED': return '✏️';
      case 'DELETED': return '🗑️';
      default: return '📢';
    }
  }

  getActivityTitle(action: string): string {
    switch (action) {
      case 'CREATED': return 'New activity available';
      case 'UPDATED': return 'Activity updated';
      case 'DELETED': return 'Activity removed';
      default: return 'Activity notification';
    }
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.profileOpen = false;
  }

  goToProfile(): void {
    this.profileOpen = false;
    this.navigate('/profile');
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement) {
    const dropdown = document.getElementById('profile-dropdown');
    const button = document.getElementById('profile-button');
    if (dropdown && button && !dropdown.contains(target) && !button.contains(target)) {
      this.profileOpen = false;
    }
  }

  // ==================== Task Notification Methods (new additions) ====================

  private getPatientId(user: User): string | null {
    if (user.role !== 'PATIENT') {
      return null;
    }

    const u: any = user;
    const val =
      u.id ??
      u.userId ??
      u.patientId ??
      u._id ??
      u.username ??
      u.email ??
      null;
    return val ? String(val) : null;
  }

  private startTaskWatcher(patientId: string): void {
    if (this.taskWatcherSub) this.taskWatcherSub.unsubscribe();

    // Initial check
    this.dailyTaskService.getTasksByPatient(patientId).subscribe({
      next: (tasks: DailyTask[]) => this.checkTasksDue(tasks),
      error: () => {},
    });

    // Poll every 30 seconds
    this.taskWatcherSub = interval(30000)
      .pipe(switchMap(() => this.dailyTaskService.getTasksByPatient(patientId)))
      .subscribe({
        next: (tasks: DailyTask[]) => this.checkTasksDue(tasks),
        error: () => {},
      });
  }

  private checkTasksDue(tasks: DailyTask[]) {
    const now = Date.now();
    const windowMs = 60000; // ±1 minute

    tasks.forEach((t: any) => {
      const dueMs = this.getTaskDueMs(t);
      if (!dueMs) return;

      const isDueNow = Math.abs(dueMs - now) <= windowMs;
      if (!isDueNow) return;

      // Prevent duplicates per day
      const dayKey = this.todayKey();
      const uniqueKey = `task_notified_${dayKey}_${t.id}_${t.scheduledTime || t.time || t.dueAt || dueMs}`;
      const already = localStorage.getItem(uniqueKey) === '1';
      if (already) return;

      localStorage.setItem(uniqueKey, '1');

      const title = (t.title || t.name || 'Task').toString().trim();
      const message = `Time to do: ${title}`;

      // Show alert
      this.showInstantTaskAlert(title, message);
      this.openTaskAlert(title, message);

      // Add to task notifications
      const newNotification: TaskNotification = {
        id: crypto.randomUUID(),
        title: 'Task reminder',
        message,
        type: 'task',
        time: 'Just now',
        read: false,
        severity: 'MEDIUM',
        taskId: t.id,
      };

      this.taskNotifications = [newNotification, ...this.taskNotifications];
      this.shakeBell(); // Also shake bell for task notifications
    });
  }

  private getTaskDueMs(t: any): number | null {
    if (t.scheduledTime) return this.buildTodayMsFromHHmm(t.scheduledTime);
    if (t.time) return this.buildTodayMsFromHHmm(t.time);
    if (t.dueAt) {
      const ms = new Date(t.dueAt).getTime();
      return isNaN(ms) ? null : ms;
    }
    return null;
  }

  private buildTodayMsFromHHmm(hhmm: string): number | null {
    if (!hhmm) return null;

    const parts = String(hhmm).split(':');
    if (parts.length < 2) return null;

    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (isNaN(hh) || isNaN(mm)) return null;

    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d.getTime();
  }

  private todayKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private showInstantTaskAlert(title: string, body: string): void {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`⏰ ${title}`, { body });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } else {
        console.log(`⏰ ${body}`);
      }
    } catch {
      console.log(`⏰ ${body}`);
    }
  }

  private openTaskAlert(title: string, message: string) {
    this.taskAlertTitle = title;
    this.taskAlertMessage = message;
    this.showTaskAlert = true;

    if (this.alertTimer) clearTimeout(this.alertTimer);
    this.alertTimer = setTimeout(() => {
      this.showTaskAlert = false;
    }, 6000);
  }

  closeTaskAlert() {
    this.showTaskAlert = false;
    if (this.alertTimer) clearTimeout(this.alertTimer);
  }

  protected getSeverityClasses(severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") {
    return undefined;
  }
}
