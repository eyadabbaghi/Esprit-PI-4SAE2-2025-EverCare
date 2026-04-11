import { Component, HostListener, OnDestroy, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService, User } from '../../pages/login/auth.service';
import { NotificationService, Notification as ActivityNotification } from '../../../../core/services/notification.service';

interface NavItem {
  id: string;
  label: string;
  route: string;
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
  ];

  user: User | null = null;
  private userSub!: Subscription;
  private pollingSub!: Subscription;
  private clearedIds = new Set<string>();
  private readonly CLEARED_KEY = 'clearedNotificationIds';

  isMobileMenuOpen = false;
  notificationsOpen = false;
  profileOpen = false;
  bellShaking = false;

  activityNotifications: (ActivityNotification & { read: boolean })[] = [];

  constructor(
    private readonly router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });

    if (this.authService.getToken()) {
      this.authService.fetchCurrentUser().subscribe({
        error: () => this.authService.logout()
      });
    }

    if (isPlatformBrowser(this.platformId)) {
      this.loadClearedIds();

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
  }

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
    return this.activityNotifications.filter(n => !n.read).length;
  }

  isActive(route: string): boolean {
    return this.router.url === route;
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
  }

  markActivityAsRead(id: string): void {
    this.activityNotifications = this.activityNotifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
  }

  handleActivityNotificationClick(notification: ActivityNotification & { read: boolean }): void {
    this.markActivityAsRead(notification.id);
    this.navigate(`/activities/${notification.activityId}`);
  }

  clearAllNotifications(): void {
    this.activityNotifications.forEach(n => this.clearedIds.add(n.id));
    this.saveClearedIds();
    this.activityNotifications = [];
  }

  getActivityIcon(action: string): string {
    switch (action) {
      case 'EVICARE_ALERT': return '🤖';
      case 'CREATED': return '🆕';
      case 'UPDATED': return '✏️';
      case 'DELETED': return '🗑️';
      default: return '📢';
    }
  }

  getActivityTitle(action: string): string {
    switch (action) {
      case 'EVICARE_ALERT': return 'EviCare prevention alert'; 
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
}