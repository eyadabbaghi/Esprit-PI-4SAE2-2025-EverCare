import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../pages/login/auth.service';

interface NavItem {
  id: string;
  label: string;
  route: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'appointment' | 'medication' | 'message';
  time: string;
  read: boolean;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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

  isMobileMenuOpen = false;
  notificationsOpen = false;
  profileOpen = false;

  notifications: Notification[] = [
    {
      id: '1',
      title: 'Fall detected',
      message: 'Critical incident detected in bathroom area.',
      type: 'alert',
      time: '5 min ago',
      read: false,
      severity: 'CRITICAL',
    },
    {
      id: '2',
      title: 'Medication reminder',
      message: 'Time to take afternoon medication.',
      type: 'medication',
      time: '15 min ago',
      read: false,
    },
    {
      id: '3',
      title: 'Appointment tomorrow',
      message: 'Checkup with Dr. Wilson at 10:00 AM.',
      type: 'appointment',
      time: '1 hour ago',
      read: true,
    },
  ];

  constructor(private readonly router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Subscribe to user changes
    this.userSub = this.authService.currentUser$.subscribe({
      next: (user) => {
        this.user = user;
        console.log('Navigation user updated:', user);
      },
      error: (err) => console.error('User subscription error:', err)
    });

    // If token exists but user is null (e.g., after page refresh), try to fetch user
    if (this.authService.getToken() && !this.user) {
      console.log('Authentication token:', this.user);
      this.authService.fetchCurrentUser().subscribe({
        next: (user) => console.log('Fetched user on navigation init:', user),
        error: (err) => console.error('Failed to fetch user on init', err)
      });
    }
  }

  ngOnDestroy(): void {
    if (this.userSub) this.userSub.unsubscribe();
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  navigate(route: string): void {
    // Protected routes that require authentication
    const protectedRoutes = [
      '/activities', '/medical-folder', '/alerts',
      '/profile', '/messages', '/daily', '/blog',
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

  markAsRead(id: string): void {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
  }

  markAllAsRead(): void {
    this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
  }

  handleNotificationClick(notification: Notification): void {
    this.markAsRead(notification.id);
    if (notification.type === 'alert') {
      this.navigate('/alerts');
    } else if (notification.type === 'appointment') {
      this.navigate('/appointments');
    }
  }

  getSeverityClasses(severity?: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#C06C84] text-white';
      case 'HIGH':
        return 'bg-[#B39DDB] text-white';
      case 'MEDIUM':
        return 'bg-[#DCCEF9] text-[#7C3AED]';
      case 'LOW':
        return 'bg-[#A8E6CF] text-[#22c55e]';
      default:
        return '';
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
    // Logout already navigates to login
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
