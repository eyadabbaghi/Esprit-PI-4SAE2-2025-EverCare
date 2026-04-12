import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { AuthService, User } from '../../pages/login/auth.service'; // adjust path if needed
import { DailyTaskService } from '../../../daily-me/services/daily-task.service';
import { DailyTask } from '../../../daily-me/models/daily-task.model';

interface NavItem {
  id: string;
  label: string;
  route: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'appointment' | 'medication' | 'message' | 'task';
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
    { id: 'medical-folder', label: 'Medical Folder', route: '/medical-folder' },
    { id: 'alerts', label: 'Alerts', route: '/alerts' },
    { id: 'tracking', label: 'Tracking', route: '/tracking' },
  ];

  user: User | null = null;

  isMobileMenuOpen = false;
  notificationsOpen = false;
  profileOpen = false;

  notifications: NotificationItem[] = [];

  private userSub!: Subscription;
  private taskWatcherSub!: Subscription;

  constructor(
    private readonly router: Router,
    private authService: AuthService,
    private dailyTaskService: DailyTaskService
  ) {}

  ngOnInit(): void {
    // ✅ Ask permission once (works on localhost OR https)
    this.requestBrowserNotificationPermission();

    // ✅ Start watcher only when user is available
    this.userSub = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;
      if (!user) return;

      const patientId = this.getPatientId(user);
      if (!patientId) return;

      this.startTaskWatcher(patientId);
    });
  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
    if (this.taskWatcherSub) this.taskWatcherSub.unsubscribe();
  }

  // =========================
  // ✅ Extract patientId safely (because User may not have "id")
  // =========================
  private getPatientId(user: User): string | null {
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

  // =========================
  // ✅ TASK WATCHER (PC time vs scheduledTime)
  // =========================
  private startTaskWatcher(patientId: string): void {
    if (this.taskWatcherSub) this.taskWatcherSub.unsubscribe();

    // run once
    this.dailyTaskService.getTasksByPatient(patientId).subscribe({
      next: (tasks: DailyTask[]) => this.checkTasksDue(tasks),
      error: () => {},
    });

    // poll every 30 seconds
    this.taskWatcherSub = interval(30000)
      .pipe(switchMap(() => this.dailyTaskService.getTasksByPatient(patientId)))
      .subscribe({
        next: (tasks: DailyTask[]) => this.checkTasksDue(tasks),
        error: () => {},
      });
  }

  // =========================
  // ✅ PC time compare with task time (scheduledTime HH:mm)
  // =========================
  private checkTasksDue(tasks: DailyTask[]) {
    const now = Date.now();           // ✅ PC time
    const windowMs = 60_000;          // ±1 minute (you can set 300000 for 5 min)

    tasks.forEach((t: any) => {
      const dueMs = this.getTaskDueMs(t);
      if (!dueMs) return;

      const isDueNow = Math.abs(dueMs - now) <= windowMs;
      if (!isDueNow) return;

      // ✅ prevent duplicates per day
      const dayKey = this.todayKey();
      const uniqueKey = `task_notified_${dayKey}_${t.id}_${t.scheduledTime || t.time || t.dueAt || dueMs}`;
      const already = localStorage.getItem(uniqueKey) === '1';
      if (already) return;

      localStorage.setItem(uniqueKey, '1');

      const title = (t.title || t.name || 'Task').toString().trim();
      const message = `Time to do: ${title}`;

      // ✅ TS-only popup: try OS notification, else fallback alert()
      this.showInstantTaskAlert(title, message);

      // ✅ Add to navbar notifications dropdown
      this.notifications = [
        {
          id: crypto.randomUUID(),
          title: 'Task reminder',
          message,
          type: 'task',
          time: 'Just now',
          read: false,
          severity: 'MEDIUM',
          taskId: t.id,
        },
        ...this.notifications,
      ];
    });
  }

  // ✅ Your backend uses scheduledTime (HH:mm)
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

    const d = new Date(); // ✅ PC date
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

  // =========================
  // ✅ TS-only "alert" popup (OS notif if allowed, else alert())
  // =========================
  private requestBrowserNotificationPermission(): void {
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
    try {
      const canUseOSNotif =
        ('Notification' in window) &&
        (Notification.permission === 'granted') &&
        (window.isSecureContext || window.location.hostname === 'localhost');

      if (canUseOSNotif) {
        new Notification(`⏰ ${title}`, { body });
        return;
      }

      // fallback (always works, TS-only)
      alert(`⏰ ${body}`);
    } catch {
      alert(`⏰ ${body}`);
    }
  }
// ✅ in-app alert state
showTaskAlert = false;
taskAlertTitle = '';
taskAlertMessage = '';
private alertTimer: any = null;

private openTaskAlert(title: string, message: string) {
  this.taskAlertTitle = title;
  this.taskAlertMessage = message;
  this.showTaskAlert = true;

  // auto-close after 6s
  if (this.alertTimer) clearTimeout(this.alertTimer);
  this.alertTimer = setTimeout(() => {
    this.showTaskAlert = false;
  }, 6000);
}

closeTaskAlert() {
  this.showTaskAlert = false;
  if (this.alertTimer) clearTimeout(this.alertTimer);
}
  // =========================
  // NAV / UI
  // =========================
  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  isActive(route: string): boolean {
    if (route === '/tracking') {
      return this.router.url.startsWith('/tracking');
    }
    return this.router.url === route;
  }

  navigate(route: string): void {
    this.router.navigateByUrl(route);
    this.isMobileMenuOpen = false;
  }

  getTrackingRoute(): string {
    const role = (this.user?.role || '').toString().toLowerCase();
    if (role === 'doctor') return '/tracking/doctor';
    if (role === 'caregiver') return '/tracking/caregiver';
    return '/tracking/saved-places';
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

  markAsRead(id: string): void {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
  }

  markAllAsRead(): void {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
  }

  handleNotificationClick(notification: NotificationItem): void {
    this.markAsRead(notification.id);

    if (notification.type === 'alert') this.navigate('/alerts');
    else if (notification.type === 'appointment') this.navigate('/appointments');
    else if (notification.type === 'task') this.navigate('/daily-me');
  }

  getSeverityClasses(severity?: string): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-[#C06C84] text-white';
      case 'HIGH': return 'bg-[#B39DDB] text-white';
      case 'MEDIUM': return 'bg-[#DCCEF9] text-[#7C3AED]';
      case 'LOW': return 'bg-[#A8E6CF] text-[#22c55e]';
      default: return '';
    }
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.profileOpen = false;
  }

  goToProfile(): void {
    this.profileOpen = false;
    this.navigate('/profile');
  }

  /** Close profile dropdown when clicking outside */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = document.getElementById('profile-dropdown');
    const button = document.getElementById('profile-button');

    if (dropdown && button && !dropdown.contains(target) && !button.contains(target)) {
      this.profileOpen = false;
    }
  }
}
