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

import {
  NotificationService,
  Notification as ActivityNotification,
} from '../../../../core/services/notification.service';
import { DailyTask } from '../../../daily-me/models/daily-task.model';
import { DailyTaskService } from '../../../daily-me/services/daily-task.service';
import { AuthService, User } from '../../pages/login/auth.service';
import { OnboardingTutorialService } from '../onboarding-tutorial/onboarding-tutorial.service';

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

type NavbarNotificationKind = 'activity' | 'blog' | 'appointment' | 'alert';

@Component({
  selector: 'app-front-office-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css'],
})
export class NavigationComponent implements OnInit, OnDestroy {
  user: User | null = null;
  authResolved = false;
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
  private activityNotificationsInitialized = false;
  private notificationAudioContext: AudioContext | null = null;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly dailyTaskService: DailyTaskService,
    private readonly tutorialService: OnboardingTutorialService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnInit(): void {
    // Request notification permission early (merged from tracking branch)
    this.requestBrowserNotificationPermission();
    this.authResolved = !this.authService.getToken() || !!this.authService.getCurrentUserValue();

    this.userSub = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      this.authResolved = !!user || !this.authService.getToken();

      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      if (user?.role === 'PATIENT') {
        const patientId = this.getPatientId(user);
        if (patientId) {
          this.startTaskWatcher(patientId);
        } else {
          this.stopTaskWatcher();
        }
      } else {
        this.stopTaskWatcher();
      }
    });

    if (this.authService.getToken() && !this.authService.getCurrentUserValue()) {
      this.authService.fetchCurrentUser().subscribe({
        error: (err) => {
          if (err?.status === 401) {
            this.authService.logout();
          } else {
            this.authResolved = !this.authService.getToken();
          }
        },
      });
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
      this.alertTimer = null;
    }
  }

  // ─── Computed properties ──────────────────────────────────────────────────

  get unreadCount(): number {
    return (
      this.activityNotifications.filter((n) => !n.read).length +
      this.taskNotifications.filter((n) => !n.read).length
    );
  }

  get cognitiveRoute(): string {
    const role = this.user?.role?.trim().toUpperCase();
    return role === 'PATIENT' || role === 'CAREGIVER'
      ? '/cognitive-stimulation'
      : '/cognitive-stimulation/catalog';
  }

  get navItems(): NavItem[] {
    const role = this.user?.role?.trim().toUpperCase();
    const doctorDirectoryItems: NavItem[] =
      role === 'PATIENT' || role === 'CAREGIVER'
        ? [{ id: 'doctors', label: 'Doctors', route: '/doctors' }]
        : [];

    return [
      { id: 'home', label: 'Home', route: '/' },
      { id: 'activities', label: 'Activities', route: '/activities' },
      ...doctorDirectoryItems,
      { id: 'appointments', label: 'Appointments', route: '/appointments' },
      { id: 'prescriptions', label: 'Prescriptions', route: '/prescriptions' },
      { id: 'medical-record', label: 'Medical Record', route: '/medical-record' },
      { id: 'cognitive-stimulation', label: 'Cognitive Care', route: this.cognitiveRoute },
      { id: 'alerts', label: 'Alerts', route: '/alerts' },
      { id: 'daily-me', label: 'Daily Me', route: '/daily-me' },
      { id: 'communication', label: 'Messages', route: '/communication' },
      { id: 'blog', label: 'Blog', route: '/blog' },
      // Dynamic tracking route based on user role
      { id: 'tracking', label: 'Tracking', route: this.getTrackingRoute() },
    ];
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  isActive(route: string): boolean {
    // Special handling for tracking routes (merged from tracking branch)
    if (route === '/tracking') {
      return this.router.url.startsWith('/tracking');
    }
    if (route === '/') {
      return this.router.url === '/';
    }
    return (
      this.router.url === route ||
      this.router.url.startsWith(`${route}/`) ||
      this.router.url.startsWith(`${route}?`)
    );
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
      '/blog',
      '/tracking', // added tracking
    ];

    const isProtectedRoute = protectedRoutes.some((protectedRoute) =>
      route === protectedRoute || route.startsWith(`${protectedRoute}/`) || route.startsWith(`${protectedRoute}?`),
    );

    if (isProtectedRoute && !this.user) {
      this.router.navigateByUrl('/login');
    } else {
      this.router.navigateByUrl(route);
    }

    this.isMobileMenuOpen = false;
    this.profileOpen = false;
    this.notificationsOpen = false;
  }

  // Returns dynamic tracking route based on user role (merged from tracking branch)
  getTrackingRoute(): string {
    const role = (this.user?.role || '').toString().toLowerCase();
    if (role === 'doctor') return '/tracking/doctor';
    if (role === 'caregiver') return '/tracking/caregiver';
    return '/tracking/saved-places';
  }

  // ─── UI toggles ───────────────────────────────────────────────────────────

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

  // ─── Notification actions ─────────────────────────────────────────────────

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
    this.navigate(this.getNotificationRoute(notification));
  }

  handleTaskNotificationClick(notification: TaskNotification): void {
    this.taskNotifications = this.taskNotifications.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n,
    );
    this.navigate('/daily-me');
  }

  // ─── Task alert banner ────────────────────────────────────────────────────

  closeTaskAlert(): void {
    this.showTaskAlert = false;
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
  }

  // ─── Display helpers ──────────────────────────────────────────────────────

  getNotificationIconClasses(notification: ActivityNotification): string {
    const kind = this.getNotificationKind(notification);
    const action = this.getNotificationAction(notification);

    if (kind === 'blog') return 'text-[#7C3AED] bg-[#F3E8FF] border-[#DDD6FE]';
    if (kind === 'appointment') return 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]';
    if (kind === 'alert') return 'text-[#C06C84] bg-[#FDE2E7] border-[#F5C2CC]';
    if (action === 'CREATED') return 'text-[#15803D] bg-[#DCFCE7] border-[#BBF7D0]';
    if (action === 'UPDATED') return 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]';
    if (action === 'DELETED') return 'text-[#BE185D] bg-[#FCE7F3] border-[#FBCFE8]';
    return 'text-[#7C3AED] bg-[#F3E8FF] border-[#DDD6FE]';
  }

  getNotificationTitle(notification: ActivityNotification): string {
    const kind = this.getNotificationKind(notification);
    const action = this.getNotificationAction(notification);
    const name = this.extractNotificationSubject(notification.details);

    if (kind === 'blog') {
      if (action === 'UPDATED') return `Blog updated${name ? `: ${name}` : ''}`;
      if (action === 'DELETED') return `Blog removed${name ? `: ${name}` : ''}`;
      return `New blog article${name ? `: ${name}` : ''}`;
    }

    if (kind === 'appointment') {
      if (action === 'UPCOMING_APPOINTMENT') return 'Upcoming appointment';
      return 'Pre-consultation form reminder';
    }

    if (kind === 'alert') {
      return 'EviCare prevention alert';
    }

    if (action === 'UPDATED') return `Activity updated${name ? `: ${name}` : ''}`;
    if (action === 'DELETED') return `Activity removed${name ? `: ${name}` : ''}`;
    if (action === 'CREATED') return `New activity${name ? `: ${name}` : ''}`;
    return 'Activity notification';
  }

  getNotificationBody(notification: ActivityNotification): string {
    const details = String(notification.details || '').trim();
    const subject = this.extractNotificationSubject(details);

    if (this.getNotificationKind(notification) === 'blog' && subject) {
      return 'A new care article is available in the blog.';
    }

    return details || 'You have a new notification.';
  }

  getNotificationRoute(notification: ActivityNotification): string {
    const kind = this.getNotificationKind(notification);

    if (kind === 'blog') {
      return notification.activityId ? `/blog?article=${notification.activityId}` : '/blog';
    }

    if (kind === 'appointment') {
      return '/appointments';
    }

    if (kind === 'alert') {
      return '/alerts';
    }

    return notification.activityId ? `/activities/${notification.activityId}` : '/activities';
  }

  getNotificationKind(notification: ActivityNotification): NavbarNotificationKind {
    const action = this.getNotificationAction(notification);
    const details = String(notification.details || '').toLowerCase();

    if (action === 'PRE_CONSULTATION_FORM' || action === 'UPCOMING_APPOINTMENT') return 'appointment';
    if (action === 'EVICARE_ALERT' || details.includes('evicare') || details.includes('alert')) return 'alert';
    if (action.startsWith('BLOG_') || details.includes('article') || details.includes('blog') || details.includes('publi')) return 'blog';
    return 'activity';
  }

  getNotificationAction(notification: ActivityNotification): string {
    return String(notification.action || '').trim().toUpperCase();
  }

  getSeverityClasses(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-[#FDE2E7] text-[#C06C84]';
      case 'HIGH':     return 'bg-[#FCE7F3] text-[#BE185D]';
      case 'MEDIUM':   return 'bg-[#EDE9FE] text-[#7C3AED]';
      case 'LOW':      return 'bg-[#DCFCE7] text-[#15803D]';
      default:         return 'bg-[#F3F4F6] text-[#6B7280]';
    }
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  // ─── Auth actions ─────────────────────────────────────────────────────────

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

  startTutorial(): void {
    this.profileOpen = false;
    this.isMobileMenuOpen = false;
    this.tutorialService.restartForCurrentUser();
  }

  // ─── Click-outside handler ────────────────────────────────────────────────

  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: EventTarget | null): void {
    if (!(target instanceof HTMLElement)) return;

    const profileDropdown = document.getElementById('profile-dropdown');
    const profileButton   = document.getElementById('profile-button');
    const alertsPanel     = document.getElementById('notifications-dropdown');
    const alertsButton    = document.getElementById('notifications-button');

    if (
      profileDropdown && profileButton &&
      !profileDropdown.contains(target) &&
      !profileButton.contains(target)
    ) {
      this.profileOpen = false;
    }

    if (
      alertsPanel && alertsButton &&
      !alertsPanel.contains(target) &&
      !alertsButton.contains(target)
    ) {
      this.notificationsOpen = false;
    }
  }

  // ─── Activity notifications (from your branch) ────────────────────────────

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
    const filtered    = notifications.filter((n) => !this.clearedIds.has(n.id) && this.isNotificationForCurrentUser(n));
    const existingMap = new Map(this.activityNotifications.map((n) => [n.id, n.read]));

    const merged = filtered.map((n) => ({
      ...n,
      read: existingMap.get(n.id) ?? false,
    }));

    const previousIds = new Set(this.activityNotifications.map((n) => n.id));
    const hasNewItems = merged.some((n) => !previousIds.has(n.id));

    this.activityNotifications = merged;
    if (!this.activityNotificationsInitialized) {
      this.activityNotificationsInitialized = true;
      return;
    }

    if (hasNewItems) {
      this.triggerNotificationCue();
    }
  }

  // ─── Task watcher (enhanced with tracking branch flexibility) ─────────────

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

  // Enhanced checkTasksDue – supports scheduledTime, time, dueAt (from tracking branch)
  private checkTasksDue(tasks: DailyTask[]): void {
    const now = Date.now();
    const windowMs = 60000;

    tasks.forEach((task) => {
      const dueMs = this.getTaskDueMs(task);
      if (!dueMs || Math.abs(dueMs - now) > windowMs) return;

      const dayKey = this.todayKey();
      const uniqueKey = `task_notified_${dayKey}_${task.id}_${task.scheduledTime || (task as any).time || (task as any).dueAt || dueMs}`;
      if (localStorage.getItem(uniqueKey) === '1') return;

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

      this.triggerNotificationCue();
    });
  }

  private extractNotificationSubject(details: string): string {
    const value = String(details || '').trim();
    if (!value) return '';

    const quoted = value.match(/['"]([^'"]+)['"]/);
    if (quoted?.[1]) return quoted[1].trim();

    const colonIndex = value.indexOf(':');
    if (colonIndex >= 0 && colonIndex < value.length - 1) {
      return value.slice(colonIndex + 1).trim();
    }

    return '';
  }

  private isNotificationForCurrentUser(notification: ActivityNotification): boolean {
    const targets = notification.targetUserIds || [];
    if (targets.length === 0) return true;

    const userIdentifiers = this.getCurrentUserIdentifiers();
    if (userIdentifiers.size === 0) return false;

    return targets.some((target) => userIdentifiers.has(String(target).trim()));
  }

  private getCurrentUserIdentifiers(): Set<string> {
    const user = this.user || this.authService.getCurrentUserValue();
    const identifiers = [
      (user as (User & { id?: string }) | null)?.id,
      user?.userId,
      (user as (User & { keycloakId?: string }) | null)?.keycloakId,
      (user as (User & { patientId?: string }) | null)?.patientId,
      (user as (User & { doctorId?: string }) | null)?.doctorId,
      (user as (User & { caregiverId?: string }) | null)?.caregiverId,
      (user as (User & { _id?: string }) | null)?._id,
      user?.email,
    ];

    return new Set(
      identifiers
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim()),
    );
  }

  // Enhanced getTaskDueMs – handles multiple date fields (from tracking branch)
  private getTaskDueMs(task: any): number | null {
    if (task.scheduledTime) return this.buildTodayMsFromHHmm(task.scheduledTime);
    if (task.time) return this.buildTodayMsFromHHmm(task.time);
    if (task.dueAt) {
      const ms = new Date(task.dueAt).getTime();
      return isNaN(ms) ? null : ms;
    }
    return null;
  }

  private buildTodayMsFromHHmm(hhmm: string): number | null {
    if (!hhmm) return null;
    const [hours, minutes] = hhmm.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
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

  private openTaskAlert(title: string, message: string): void {
    this.taskAlertTitle = title;
    this.taskAlertMessage = message;
    this.showTaskAlert = true;

    if (this.alertTimer) clearTimeout(this.alertTimer);
    this.alertTimer = setTimeout(() => {
      this.showTaskAlert = false;
      this.alertTimer = null;
    }, 6000);
  }

  // Enhanced browser notification with secure context check (from tracking branch)
  private requestBrowserNotificationPermission(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  private showInstantTaskAlert(title: string, body: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const canUseOSNotif =
        ('Notification' in window) &&
        Notification.permission === 'granted' &&
        (window.isSecureContext || window.location.hostname === 'localhost');

      if (canUseOSNotif) {
        new Notification(`Task: ${title}`, { body });
        return;
      }
      // Fallback alert (from tracking branch) – but avoid alert spam, use console?
      // Keeping your original console log as less intrusive
      console.log(`${title}: ${body}`);
    } catch {
      console.log(body);
    }
  }

  // ─── Persistence (from your branch) ───────────────────────────────────────

  private loadClearedIds(): void {
    try {
      const stored = localStorage.getItem(this.clearedKey);
      if (!stored) return;
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

  // ─── Bell animation (from your branch) ────────────────────────────────────

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

  private triggerNotificationCue(): void {
    this.shakeBell();
    this.playNotificationSound();
  }

  private playNotificationSound(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextCtor) return;

      this.notificationAudioContext ??= new AudioContextCtor();
      const context = this.notificationAudioContext;

      if (context.state === 'suspended') {
        context.resume()
          .then(() => this.playNotificationSound())
          .catch(() => undefined);
        return;
      }

      const now = context.currentTime;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      gain.connect(context.destination);

      [660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.1);
        oscillator.connect(gain);
        oscillator.start(now + index * 0.1);
        oscillator.stop(now + 0.34 + index * 0.08);
      });
    } catch {
      // Browsers may block audio until the user interacts with the page.
    }
  }

  // ─── Patient ID resolution (enhanced from both) ───────────────────────────

  private getPatientId(user: User): string | null {
    const candidate =
      (user as User & { id?: string }).id ??
      user.userId ??
      (user as User & { patientId?: string }).patientId ??
      (user as User & { _id?: string })._id ??
      (user as User & { username?: string }).username ??
      user.email ??
      null;

    return candidate ? String(candidate).trim() : null;
  }
}
