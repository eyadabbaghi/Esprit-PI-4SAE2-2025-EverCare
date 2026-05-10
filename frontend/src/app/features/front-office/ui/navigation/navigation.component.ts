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
import { Subscription, forkJoin, interval, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import {
  NotificationService,
  Notification as ActivityNotification,
} from '../../../../core/services/notification.service';
import { DailyTask } from '../../../daily-me/models/daily-task.model';
import { DailyTaskService } from '../../../daily-me/services/daily-task.service';
import { AssessmentService } from '../../../medical-record/services/assessment.service';
import { MedicalRecordService } from '../../../medical-record/services/medical-record.service';
import { AuthService, User } from '../../pages/login/auth.service';
import { OnboardingTutorialService } from '../onboarding-tutorial/onboarding-tutorial.service';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';
import { ChatService } from '../../../communication/services/chat.service';
import { Conversation, Message } from '../../../communication/models/messages.model';

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

type WellnessReminderKind =
  | 'activities'
  | 'blogs'
  | 'daily'
  | 'ai'
  | 'patientDaily'
  | 'patientLocation'
  | 'patientAppointments'
  | 'patientMedicalRecords'
  | 'recommendActivities'
  | 'appointments'
  | 'incidentsAlerts'
  | 'monitorPatient'
  | 'patientAlerts';

interface WellnessNotification {
  id: string;
  kind: WellnessReminderKind;
  title: string;
  message: string;
  route: string;
  time: string;
  read: boolean;
}

interface MessageNotification {
  id: string;
  conversationId: number;
  senderEmail: string;
  senderName: string;
  senderAvatar?: string;
  preview: string;
  time: string;
  sentAt: string;
  read: boolean;
}

type NavbarNotificationKind = 'activity' | 'blog' | 'appointment' | 'alert' | 'incident' | 'doctor-recommendation' | 'medical-record' | 'alzheimer' | 'connection' | 'routine' | 'prevention' | 'tracking' | 'prescription';

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
  verificationReminderRead = false;

  activityNotifications: Array<ActivityNotification & { read: boolean }> = [];
  taskNotifications: TaskNotification[] = [];
  wellnessNotifications: WellnessNotification[] = [];
  messageNotifications: MessageNotification[] = [];
  showRecoveryEmailReminder = false;

  private userSub?: Subscription;
  private pollingSub?: Subscription;
  private taskWatcherSub?: Subscription;
  private completionWatcherSub?: Subscription;
  private wellnessReminderSub?: Subscription;
  private messageWatcherSub?: Subscription;
  private alertTimer: ReturnType<typeof setTimeout> | null = null;
  private clearedIds = new Set<string>();
  private readonly clearedKey = 'clearedNotificationIds';
  private activityNotificationsInitialized = false;
  private messageNotificationsInitialized = false;
  private notificationAudioContext: AudioContext | null = null;
  private readonly caregiverMedicalReminderKey = 'caregiverMedicalRecordReminder';
  private readonly caregiverMedicalReminderIntervalMs = 60 * 60 * 1000;
  private caregiverReminderChecks = new Set<string>();
  private readonly messageSeenKeyPrefix = 'evercare_seen_message_notifications';
  private readonly messageLastSeenKeyPrefix = 'evercare_last_message_notification_scan';
  private readonly recoveryReminderKeyPrefix = 'evercare_recovery_email_popup';
  private readonly recoveryReminderIntervalMs = 72 * 60 * 60 * 1000;
  private recoveryReminderTimer: ReturnType<typeof setTimeout> | null = null;
  private senderProfileCache = new Map<string, User>();
  private failedSenderProfileEmails = new Set<string>();

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
    private readonly dailyTaskService: DailyTaskService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly assessmentService: AssessmentService,
    private readonly tutorialService: OnboardingTutorialService,
    private readonly feedback: AppFeedbackService,
    private readonly chatService: ChatService,
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

      this.startCareCompletionWatcher(user);
      this.startWellnessReminderWatcher(user);
      this.startMessageNotificationWatcher(user);
      this.scheduleRecoveryEmailReminder(user);
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
    this.completionWatcherSub?.unsubscribe();
    this.wellnessReminderSub?.unsubscribe();
    this.messageWatcherSub?.unsubscribe();
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
      this.alertTimer = null;
    }
    if (this.recoveryReminderTimer) {
      clearTimeout(this.recoveryReminderTimer);
      this.recoveryReminderTimer = null;
    }
  }

  // ─── Computed properties ──────────────────────────────────────────────────

  get unreadCount(): number {
    return (
      this.activityNotifications.filter((n) => !n.read).length +
      this.taskNotifications.filter((n) => !n.read).length +
      this.wellnessNotifications.filter((n) => !n.read).length +
      this.messageNotifications.filter((n) => !n.read).length +
      (this.hasVerificationReminder && !this.verificationReminderRead ? 1 : 0)
    );
  }

  get hasVerificationReminder(): boolean {
    return !!this.user && this.user.role !== 'ADMIN' && !this.user.isVerified;
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
    this.wellnessNotifications = this.wellnessNotifications.map((n) => ({ ...n, read: true }));
    this.messageNotifications = this.messageNotifications.map((n) => ({ ...n, read: true }));
    this.verificationReminderRead = true;
  }

  clearAllNotifications(): void {
    this.activityNotifications.forEach((n) => this.clearedIds.add(n.id));
    this.saveClearedIds();
    this.messageNotifications.forEach((n) => this.markMessageNotificationSeen(n.id));
    this.activityNotifications = [];
    this.taskNotifications = [];
    this.wellnessNotifications = [];
    this.messageNotifications = [];
    this.verificationReminderRead = true;
  }

  handleWellnessNotificationClick(notification: WellnessNotification): void {
    this.wellnessNotifications = this.wellnessNotifications.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n,
    );
    this.navigate(notification.route);
  }

  handleMessageNotificationClick(notification: MessageNotification): void {
    this.messageNotifications = this.messageNotifications.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n,
    );
    this.markMessageNotificationSeen(notification.id);
    this.notificationsOpen = false;
    this.router.navigate(['/communication'], { queryParams: { contact: notification.senderEmail } });
  }

  handleActivityNotificationClick(notification: ActivityNotification & { read: boolean }): void {
    this.activityNotifications = this.activityNotifications.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n,
    );
    if (this.getNotificationKind(notification) === 'alzheimer' && this.user?.role === 'CAREGIVER') {
      const parsed = this.parseNotificationDetails(notification.details);
      const patientId = parsed.patientId || this.extractPatientIdFromActivity(notification.activityId);
      if (patientId) {
        localStorage.setItem('caregiverAlzheimerPatientId', patientId);
        localStorage.setItem('caregiverAlzheimerPatientEmail', parsed.patientEmail || '');
        localStorage.setItem('caregiverAlzheimerPatientName', parsed.patientName || 'Patient');
        localStorage.setItem('caregiverAlzheimerReturnTo', 'profile');
        localStorage.setItem('alzAssessmentReturnTo', 'profile');
        localStorage.setItem('showAlzheimerAssessment', 'true');
        this.navigate('/alzheimer-assessment');
        return;
      }
    }
    this.navigate(this.getNotificationRoute(notification));
  }

  handleTaskNotificationClick(notification: TaskNotification): void {
    this.taskNotifications = this.taskNotifications.map((n) =>
      n.id === notification.id ? { ...n, read: true } : n,
    );
    this.navigate('/daily-me');
  }

  handleVerificationReminderClick(): void {
    this.verificationReminderRead = true;
    this.profileOpen = false;
    this.notificationsOpen = false;
    this.router.navigate(['/profile'], { fragment: 'profile-settings-section' });
  }

  dismissRecoveryEmailReminder(): void {
    this.showRecoveryEmailReminder = false;
    const user = this.user || this.authService.getCurrentUserValue();
    if (user && isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.recoveryReminderKey(user), String(Date.now()));
    }
  }

  openRecoveryEmailSettings(): void {
    this.dismissRecoveryEmailReminder();
    this.profileOpen = false;
    this.notificationsOpen = false;
    this.router.navigate(['/profile'], { fragment: 'profile-settings-section' });
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
    if (kind === 'tracking') return 'text-[#BE123C] bg-[#FFF1F2] border-[#FECDD3]';
    if (kind === 'prescription') return 'text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]';
    if (kind === 'incident') return 'text-[#BE185D] bg-[#FCE7F3] border-[#FBCFE8]';
    if (kind === 'doctor-recommendation') return 'text-[#6D28D9] bg-[#F5F0FF] border-[#C4B5FD]';
    if (kind === 'prevention') return 'text-[#6D28D9] bg-[#F5F0FF] border-[#DDD6FE]';
    if (kind === 'medical-record') return 'text-[#6D28D9] bg-[#F5F0FF] border-[#C4B5FD]';
    if (kind === 'alzheimer') return 'text-[#7C3AED] bg-[#F5F0FF] border-[#C4B5FD]';
    if (kind === 'connection') return 'text-[#6D28D9] bg-[#F5F0FF] border-[#C4B5FD]';
    if (kind === 'routine') return 'text-[#7C3AED] bg-[#F3E8FF] border-[#DDD6FE]';
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
      if (action === 'ALERT_CREATED') return 'Incident alert';
      return 'EverCare prevention alert';
    }

    if (kind === 'tracking') {
      return 'Tracking safe-zone alert';
    }

    if (kind === 'prescription') {
      return 'Medication schedule';
    }

    if (kind === 'incident') {
      return 'New patient incident';
    }

    if (kind === 'doctor-recommendation') {
      return 'Doctor recommendation';
    }

    if (kind === 'prevention') {
      return 'EverCare prevention insight';
    }

    if (kind === 'medical-record') {
      if (action === 'MEDICAL_RECORD_CREATED') return 'New patient medical record';
      return 'Medical record request';
    }

    if (kind === 'alzheimer') {
      return 'Alzheimer assessment request';
    }

    if (kind === 'connection') {
      return action === 'USER_DISASSOCIATED' ? 'Care connection removed' : 'New care connection';
    }

    if (kind === 'routine') {
      if (action === 'ROUTINE_COMPLETED') return 'Routine checked';
      if (action === 'ROUTINE_PENDING') return 'Routine needs attention';
      if (action === 'ROUTINE_REMINDER') return 'Routine reminder';
      return 'New routine item';
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

    if (this.getNotificationKind(notification) === 'medical-record') {
      const parsed = this.parseNotificationDetails(notification.details);
      if (this.getNotificationAction(notification) === 'MEDICAL_RECORD_CREATED') {
        return parsed.message || details || 'A new medical record was added for one of your associated patients.';
      }
      return parsed.message || details || 'A patient asked you to fill their medical record and assessment.';
    }

    if (this.getNotificationKind(notification) === 'alzheimer') {
      const parsed = this.parseNotificationDetails(notification.details);
      return parsed.message || details || 'A patient asked you to complete their Alzheimer assessment.';
    }

    if (this.getNotificationKind(notification) === 'connection') {
      const parsed = this.parseNotificationDetails(notification.details);
      return parsed.message || details || 'Your EverCare care connections changed.';
    }

    if (this.getNotificationKind(notification) === 'routine') {
      return details || 'There is an update on an EverCare routine.';
    }

    if (this.getNotificationKind(notification) === 'prevention') {
      return details || 'EverCare Prevention noticed a risk pattern that may need attention.';
    }

    if (this.getNotificationKind(notification) === 'incident') {
      return details || 'An associated patient added a new incident.';
    }

    if (this.getNotificationKind(notification) === 'tracking') {
      const parsed = this.parseNotificationDetails(notification.details);
      return parsed.message || 'A patient is outside their configured safe zone.';
    }

    if (this.getNotificationKind(notification) === 'prescription') {
      const parsed = this.parseNotificationDetails(notification.details);
      return parsed.message || 'A daily medication schedule was added.';
    }

    if (this.getNotificationKind(notification) === 'doctor-recommendation') {
      return details || 'A doctor added a recommendation for an incident.';
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

    if (kind === 'tracking') {
      return '/tracking/caregiver';
    }

    if (kind === 'prescription') {
      return '/prescriptions';
    }

    if (kind === 'alert' || kind === 'incident' || kind === 'doctor-recommendation') {
      return '/alerts';
    }

    if (kind === 'prevention') {
      return '/alerts';
    }

    if (kind === 'medical-record') {
      return '/medical-record';
    }

    if (kind === 'alzheimer') {
      return '/profile';
    }

    if (kind === 'connection') {
      return '/profile';
    }

    if (kind === 'routine') {
      return '/activities';
    }

    return notification.activityId ? `/activities/${notification.activityId}` : '/activities';
  }

  getNotificationKind(notification: ActivityNotification): NavbarNotificationKind {
    const action = this.getNotificationAction(notification);
    const details = String(notification.details || '').toLowerCase();

    if (action === 'PRE_CONSULTATION_FORM' || action === 'UPCOMING_APPOINTMENT') return 'appointment';
    if (action === 'USER_ASSOCIATED' || action === 'USER_DISASSOCIATED') return 'connection';
    if (action.startsWith('ROUTINE_')) return 'routine';
    if (action === 'PATIENT_INCIDENT_CREATED') return 'incident';
    if (action === 'TRACKING_SAFE_ZONE_ALERT') return 'tracking';
    if (action === 'PRESCRIPTION_DAILY_SCHEDULE') return 'prescription';
    if (action === 'DOCTOR_RECOMMENDATION') return 'doctor-recommendation';
    if (action === 'MEDICAL_RECORD_CAREGIVER_REQUEST' || action === 'MEDICAL_RECORD_INCOMPLETE_REMINDER' || action === 'MEDICAL_RECORD_CREATED') return 'medical-record';
    if (action === 'ALZHEIMER_ASSESSMENT_CAREGIVER_REQUEST' || action === 'ALZHEIMER_ASSESSMENT_REMINDER') return 'alzheimer';
    if (action === 'EVERCARE_PREVENTION' || action === 'EVICARE_ALERT' || details.includes('evicare') || details.includes('evercare prevention')) return 'prevention';
    if (details.includes('alert')) return 'alert';
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

    this.checkCaregiverMedicalRecordReminders(merged);
  }

  private checkCaregiverMedicalRecordReminders(notifications: Array<ActivityNotification & { read: boolean }>): void {
    if (!isPlatformBrowser(this.platformId) || this.user?.role !== 'CAREGIVER') {
      return;
    }

    const requests = notifications.filter((notification) =>
      ['MEDICAL_RECORD_CAREGIVER_REQUEST', 'ALZHEIMER_ASSESSMENT_CAREGIVER_REQUEST'].includes(this.getNotificationAction(notification)),
    );

    requests.forEach((notification) => {
      const action = this.getNotificationAction(notification);
      const parsed = this.parseNotificationDetails(notification.details);
      const patientId = parsed.patientId || this.extractPatientIdFromActivity(notification.activityId);
      if (!patientId) {
        this.triggerTimedCaregiverReminder(notification.id, notification);
        return;
      }

      if (this.caregiverReminderChecks.has(notification.id)) {
        return;
      }

      const reminderKey = `${this.caregiverMedicalReminderKey}:${notification.id}`;
      const lastReminder = Number(localStorage.getItem(reminderKey) || '0');
      if (Date.now() - lastReminder < this.caregiverMedicalReminderIntervalMs) {
        return;
      }

      this.caregiverReminderChecks.add(notification.id);
      const status$ = action === 'ALZHEIMER_ASSESSMENT_CAREGIVER_REQUEST'
        ? forkJoin({
            completed: this.authService.getPatientAlzheimerAssessment(patientId).pipe(
              map((result) => !!result),
              catchError(() => of(false)),
            ),
          })
        : forkJoin({
            hasRecord: this.medicalRecordService.getByPatientId(patientId).pipe(
              map(() => true),
              catchError(() => of(false)),
            ),
            hasAssessment: this.assessmentService.getByPatient(patientId).pipe(
              map((reports) => reports.length > 0),
              catchError(() => of(false)),
            ),
          }).pipe(map(({ hasRecord, hasAssessment }) => ({ completed: hasRecord && hasAssessment })));

      status$.subscribe(({ completed }) => {
        this.caregiverReminderChecks.delete(notification.id);
        if (completed) {
          return;
        }
        localStorage.setItem(reminderKey, String(Date.now()));
        this.triggerNotificationCue();
        this.openCareReminderToast(
          action === 'ALZHEIMER_ASSESSMENT_CAREGIVER_REQUEST' ? 'Alzheimer assessment request' : 'Medical record request',
          this.getNotificationBody(notification),
        );
      });
    });
  }

  private triggerTimedCaregiverReminder(id: string, notification: ActivityNotification): void {
    const reminderKey = `${this.caregiverMedicalReminderKey}:${id}`;
    const lastReminder = Number(localStorage.getItem(reminderKey) || '0');
    if (Date.now() - lastReminder < this.caregiverMedicalReminderIntervalMs) {
      return;
    }
    localStorage.setItem(reminderKey, String(Date.now()));
    this.triggerNotificationCue();
    const title = this.getNotificationAction(notification) === 'ALZHEIMER_ASSESSMENT_CAREGIVER_REQUEST'
      ? 'Alzheimer assessment request'
      : 'Medical record request';
    this.openCareReminderToast(title, this.getNotificationBody(notification));
  }

  // ─── Task watcher (enhanced with tracking branch flexibility) ─────────────

  private startCareCompletionWatcher(user: User | null): void {
    this.completionWatcherSub?.unsubscribe();
    this.completionWatcherSub = undefined;

    if (!isPlatformBrowser(this.platformId) || !user || !['PATIENT', 'CAREGIVER'].includes(user.role)) {
      return;
    }

    this.checkCareCompletionReminders(user);
    this.completionWatcherSub = interval(this.caregiverMedicalReminderIntervalMs).subscribe(() => {
      const latestUser = this.authService.getCurrentUserValue();
      if (latestUser) {
        this.checkCareCompletionReminders(latestUser);
      }
    });
  }

  private startWellnessReminderWatcher(user: User | null): void {
    this.wellnessReminderSub?.unsubscribe();
    this.wellnessReminderSub = undefined;

    if (!isPlatformBrowser(this.platformId) || !user) {
      this.wellnessNotifications = [];
      return;
    }

    setTimeout(() => this.maybeAddWellnessReminder(), 3500);
    this.wellnessReminderSub = interval(10 * 60 * 1000).subscribe(() => this.maybeAddWellnessReminder());
  }

  private scheduleRecoveryEmailReminder(user: User | null): void {
    if (this.recoveryReminderTimer) {
      clearTimeout(this.recoveryReminderTimer);
      this.recoveryReminderTimer = null;
    }
    this.showRecoveryEmailReminder = false;

    if (!isPlatformBrowser(this.platformId) || !user || user.role !== 'PATIENT' || !!user.recoveryEmail) {
      return;
    }

    const lastShown = Number(localStorage.getItem(this.recoveryReminderKey(user)) || '0');
    if (Date.now() - lastShown < this.recoveryReminderIntervalMs) {
      return;
    }

    this.recoveryReminderTimer = setTimeout(() => {
      const latestUser = this.authService.getCurrentUserValue();
      if (latestUser?.role === 'PATIENT' && !latestUser.recoveryEmail) {
        this.showRecoveryEmailReminder = true;
        localStorage.setItem(this.recoveryReminderKey(latestUser), String(Date.now()));
        this.triggerNotificationCue();
      }
    }, 9000);
  }

  private recoveryReminderKey(user: User): string {
    const id = user.userId || user.email || 'guest';
    return `${this.recoveryReminderKeyPrefix}_${id}`;
  }

  private maybeAddWellnessReminder(): void {
    const user = this.user || this.authService.getCurrentUserValue();
    if (!user || !isPlatformBrowser(this.platformId)) return;

    const settings = this.getWellnessReminderSettings(user);
    const reminders = this.getRoleBasedWellnessReminders(user);

    const eligible = reminders.filter((reminder) => settings[reminder.kind] && this.isWellnessReminderDue(user, reminder.kind));
    if (!eligible.length) return;

    const reminder = eligible[Math.floor(Math.random() * eligible.length)];
    this.markWellnessReminderSent(user, reminder.kind);
    this.wellnessNotifications = [
      {
        ...reminder,
        id: `wellness-${reminder.kind}-${Date.now()}`,
        time: 'Just now',
        read: false,
      },
      ...this.wellnessNotifications.filter((item) => item.kind !== reminder.kind).slice(0, 3),
    ];
    this.triggerNotificationCue();
  }

  private getWellnessReminderSettings(user: User): Record<WellnessReminderKind, boolean> {
    const defaults: Record<WellnessReminderKind, boolean> = {
      activities: true,
      blogs: true,
      daily: true,
      ai: true,
      patientDaily: true,
      patientLocation: true,
      patientAppointments: true,
      patientMedicalRecords: true,
      recommendActivities: true,
      appointments: true,
      incidentsAlerts: true,
      monitorPatient: true,
      patientAlerts: true,
    };
    try {
      return {
        ...defaults,
        ...JSON.parse(localStorage.getItem(this.wellnessSettingsKey(user)) || '{}'),
      };
    } catch {
      return defaults;
    }
  }

  private isWellnessReminderDue(user: User, kind: WellnessReminderKind): boolean {
    const last = Number(localStorage.getItem(`${this.wellnessSettingsKey(user)}:last:${kind}`) || '0');
    return Date.now() - last > 6 * 60 * 60 * 1000;
  }

  private markWellnessReminderSent(user: User, kind: WellnessReminderKind): void {
    localStorage.setItem(`${this.wellnessSettingsKey(user)}:last:${kind}`, String(Date.now()));
  }

  private wellnessSettingsKey(user: User): string {
    const id = user.userId || user.email || 'guest';
    return `evercare_nav_reminder_settings_${id}`;
  }

  private startMessageNotificationWatcher(user: User | null): void {
    this.messageWatcherSub?.unsubscribe();
    this.messageWatcherSub = undefined;
    this.messageNotificationsInitialized = false;
    this.senderProfileCache.clear();
    this.failedSenderProfileEmails = user ? this.getFailedSenderProfileEmails(user) : new Set<string>();

    if (!isPlatformBrowser(this.platformId) || !user?.email) {
      this.messageNotifications = [];
      return;
    }

    this.fetchMessageNotifications(user);
    this.messageWatcherSub = interval(12000).subscribe(() => {
      const latestUser = this.authService.getCurrentUserValue();
      if (latestUser?.email) {
        this.fetchMessageNotifications(latestUser);
      }
    });
  }

  private fetchMessageNotifications(user: User): void {
    const currentEmail = this.normalizeEmail(user.email);
    if (!currentEmail) return;

    this.chatService.getConversations(currentEmail).pipe(
      switchMap((conversations) => {
        const activeConversations = (conversations || []).filter((conversation) =>
          conversation?.id && conversation.isActive !== false && conversation.status !== 'ARCHIVED',
        );
        if (!activeConversations.length) {
          return of([] as MessageNotification[]);
        }
        return forkJoin(
          activeConversations.map((conversation) =>
            this.chatService.getMessages(Number(conversation.id)).pipe(
              map((messages) => this.toLatestMessageNotification(conversation, messages || [], currentEmail)),
              catchError(() => of(null)),
            ),
          ),
        ).pipe(
          map((notifications) =>
            notifications.filter((notification): notification is MessageNotification => !!notification),
          ),
        );
      }),
      catchError(() => of([] as MessageNotification[])),
    ).subscribe((notifications) => this.mergeMessageNotifications(user, notifications));
  }

  private toLatestMessageNotification(
    conversation: Conversation,
    messages: Message[],
    currentEmail: string,
  ): MessageNotification | null {
    const latestIncoming = [...messages]
      .filter((message) => !!message?.id && this.normalizeEmail(message.senderId) !== currentEmail)
      .sort((a, b) => this.messageTimeMs(a) - this.messageTimeMs(b))
      .pop();

    if (!latestIncoming) return null;

    const senderEmail = this.normalizeEmail(latestIncoming.senderId);
    if (this.failedSenderProfileEmails.has(senderEmail)) {
      return null;
    }

    const profile = this.senderProfileCache.get(senderEmail);
    if (!profile) {
      this.loadMessageSenderProfile(senderEmail);
      return null;
    }

    const sentAtMs = this.messageTimeMs(latestIncoming);

    return {
      id: `message-${latestIncoming.id}`,
      conversationId: Number(conversation.id),
      senderEmail,
      senderName: profile?.name || senderEmail,
      senderAvatar: profile?.profilePicture,
      preview: this.getMessagePreview(latestIncoming),
      sentAt: sentAtMs ? new Date(sentAtMs).toISOString() : new Date().toISOString(),
      time: this.formatMessageNotificationTime(latestIncoming),
      read: false,
    };
  }

  private mergeMessageNotifications(user: User, notifications: MessageNotification[]): void {
    const seenIds = this.getSeenMessageNotificationIds(user);
    const existingRead = new Map(this.messageNotifications.map((notification) => [notification.id, notification.read]));
    const merged = notifications
      .filter((notification) => !seenIds.has(notification.id))
      .map((notification) => ({
        ...notification,
        read: existingRead.get(notification.id) ?? false,
      }))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 5);

    const previousIds = new Set(this.messageNotifications.map((notification) => notification.id));
    const hasNewItems = merged.some((notification) => !previousIds.has(notification.id));
    this.messageNotifications = merged;

    if (!this.messageNotificationsInitialized) {
      this.messageNotificationsInitialized = true;
      this.markMessageScan(user);
      return;
    }

    if (hasNewItems && this.hasRecentMessageNotification(user, merged)) {
      this.triggerNotificationCue();
    }
  }

  private loadMessageSenderProfile(senderEmail: string): void {
    if (!senderEmail || this.senderProfileCache.has(senderEmail) || this.failedSenderProfileEmails.has(senderEmail)) return;

    this.authService.getUserByEmail(senderEmail).pipe(catchError(() => of(null))).subscribe((profile) => {
      if (!profile) {
        this.rememberFailedSenderProfileEmail(senderEmail);
        return;
      }
      this.senderProfileCache.set(senderEmail, profile);
      this.messageNotifications = this.messageNotifications.map((notification) =>
        notification.senderEmail === senderEmail
          ? {
              ...notification,
              senderName: profile.name || senderEmail,
              senderAvatar: profile.profilePicture,
            }
          : notification,
      );
      this.cdr.markForCheck();
    });
  }

  private getFailedSenderProfileEmails(user: User): Set<string> {
    if (!isPlatformBrowser(this.platformId)) return new Set<string>();
    try {
      return new Set(JSON.parse(localStorage.getItem(this.messageFailedSenderKey(user)) || '[]'));
    } catch {
      return new Set<string>();
    }
  }

  private rememberFailedSenderProfileEmail(senderEmail: string): void {
    const user = this.user || this.authService.getCurrentUserValue();
    if (!user || !senderEmail || !isPlatformBrowser(this.platformId)) return;
    this.failedSenderProfileEmails.add(senderEmail);
    localStorage.setItem(this.messageFailedSenderKey(user), JSON.stringify([...this.failedSenderProfileEmails].slice(-80)));
  }

  private messageFailedSenderKey(user: User): string {
    const id = user.userId || user.email || 'guest';
    return `evercare_failed_message_sender_profiles_${id}`;
  }

  private getSeenMessageNotificationIds(user: User): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem(this.messageSeenKey(user)) || '[]'));
    } catch {
      return new Set<string>();
    }
  }

  private markMessageNotificationSeen(id: string): void {
    const user = this.user || this.authService.getCurrentUserValue();
    if (!user || !isPlatformBrowser(this.platformId)) return;
    const seenIds = this.getSeenMessageNotificationIds(user);
    seenIds.add(id);
    localStorage.setItem(this.messageSeenKey(user), JSON.stringify([...seenIds].slice(-80)));
  }

  private messageSeenKey(user: User): string {
    const id = user.userId || user.email || 'guest';
    return `${this.messageSeenKeyPrefix}_${id}`;
  }

  private markMessageScan(user: User): void {
    localStorage.setItem(this.messageLastSeenKey(user), String(Date.now()));
  }

  private hasRecentMessageNotification(user: User, notifications: MessageNotification[]): boolean {
    const lastScan = Number(localStorage.getItem(this.messageLastSeenKey(user)) || '0');
    this.markMessageScan(user);
    if (!lastScan) return true;
    return notifications.some((notification) => new Date(notification.sentAt).getTime() > lastScan - 1000);
  }

  private messageLastSeenKey(user: User): string {
    const id = user.userId || user.email || 'guest';
    return `${this.messageLastSeenKeyPrefix}_${id}`;
  }

  private getMessagePreview(message: Message): string {
    if (message.content?.trim()) return message.content.trim();
    if (message.fileUrl) return message.fileType?.startsWith('image/') ? 'Sent an image' : 'Sent an attachment';
    return 'Sent a message';
  }

  private formatMessageNotificationTime(message: Message): string {
    const sentAt = this.messageTimeMs(message);
    if (!sentAt) return 'Just now';
    const diffMinutes = Math.max(0, Math.round((Date.now() - sentAt) / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return new Date(sentAt).toLocaleDateString();
  }

  private messageTimeMs(message: Message): number {
    const rawSentAt = message.sentAt as unknown;
    if (Array.isArray(rawSentAt)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nano = 0] = rawSentAt.map(Number);
      const time = new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1000000)).getTime();
      return Number.isNaN(time) ? 0 : time;
    }

    const value = message.sentAt instanceof Date ? message.sentAt : new Date(message.sentAt);
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  private normalizeEmail(email?: string | null): string {
    return (email || '').trim().toLowerCase();
  }

  private getRoleBasedWellnessReminders(user: User): Array<Omit<WellnessNotification, 'id' | 'time' | 'read'>> {
    const role = (user.role || '').toUpperCase();

    if (role === 'DOCTOR') {
      return [
        {
          kind: 'patientDaily',
          title: 'Check patient daily emotions',
          message: 'Review Daily Me entries from your associated patients for mood and behavior changes.',
          route: '/daily-me',
        },
        {
          kind: 'appointments',
          title: 'Check your appointments',
          message: 'A quick schedule review helps you stay ready for upcoming consultations.',
          route: '/appointments',
        },
        {
          kind: 'patientMedicalRecords',
          title: 'Review patient medical records',
          message: 'Your associated patients may have new health context waiting in their records.',
          route: '/medical-record',
        },
        {
          kind: 'recommendActivities',
          title: 'Recommend patient activities',
          message: 'Personalized activities can support your patients between appointments.',
          route: '/activities',
        },
        {
          kind: 'patientAlerts',
          title: 'Check patient incidents and alerts',
          message: 'Review recent incidents and alerts so care plans stay responsive.',
          route: '/alerts',
        },
        {
          kind: 'ai',
          title: 'Consult the EverCare AI assistant',
          message: 'Use EverCare AI for quick care guidance and incident support.',
          route: '/',
        },
      ];
    }

    if (role === 'CAREGIVER') {
      return [
        {
          kind: 'patientDaily',
          title: 'Check your patient daily emotions',
          message: 'Daily Me can reveal mood, memory, and routine changes for your patient.',
          route: '/daily-me',
        },
        {
          kind: 'patientLocation',
          title: 'Check your patient location',
          message: 'Review safe-zone and location updates for your associated patient.',
          route: '/tracking/caregiver',
        },
        {
          kind: 'patientAppointments',
          title: 'Check patient appointments',
          message: 'Upcoming appointments may need caregiver preparation or support.',
          route: '/appointments',
        },
        {
          kind: 'patientMedicalRecords',
          title: 'Review patient medical records',
          message: 'Keep your patient record and assessments complete and current.',
          route: '/medical-record',
        },
        {
          kind: 'activities',
          title: "Check your patient's activities",
          message: 'A structured routine can help your patient stay calm and engaged.',
          route: '/activities',
        },
        {
          kind: 'incidentsAlerts',
          title: 'Add an incident or alert',
          message: 'Log anything important now so the care team has the full context.',
          route: '/alerts',
        },
        {
          kind: 'monitorPatient',
          title: 'Monitor your patient',
          message: 'A quick care check can catch location, routine, or safety changes early.',
          route: '/tracking/caregiver',
        },
        {
          kind: 'ai',
          title: 'Consult the EverCare AI assistant',
          message: 'EverCare AI can help you think through care questions quickly.',
          route: '/',
        },
      ];
    }

    return [
      {
        kind: 'activities',
        title: "Check today's activities",
        message: 'A short routine can keep the day structured and calm.',
        route: '/activities',
      },
      {
        kind: 'blogs',
        title: 'Check blogs',
        message: 'There may be a helpful EverCare article waiting for you.',
        route: '/blog',
      },
      {
        kind: 'daily',
        title: 'Did you do your daily entry today?',
        message: 'A quick Daily Me note helps track mood, memory, and habits.',
        route: '/daily-me',
      },
      {
        kind: 'incidentsAlerts',
        title: 'Add an incident or alert',
        message: 'If something happened today, add an incident or alert so your care team can follow it.',
        route: '/alerts',
      },
      {
        kind: 'ai',
        title: 'Consult the EverCare AI assistant',
        message: "He's there for you when you need quick guidance.",
        route: '/',
      },
    ];
  }

  private checkCareCompletionReminders(user: User): void {
    if (user.role === 'PATIENT') {
      const patientId = this.getPatientId(user);
      if (patientId) {
        this.checkPatientCompletion(patientId, user.name || user.email || 'your profile', true);
      }
      return;
    }

    if (user.role === 'CAREGIVER') {
      (user.patientEmails || []).forEach((email) => {
        this.authService.getUserByEmail(email).pipe(catchError(() => of(null))).subscribe((patient) => {
          const patientId = patient ? this.getPatientId(patient) : '';
          if (patientId) {
            this.checkPatientCompletion(patientId, patient?.name || email, false);
          }
        });
      });
    }
  }

  private checkPatientCompletion(patientId: string, patientLabel: string, isOwnProfile: boolean): void {
    if (this.router.url.includes('/setup-face-id')) {
      return;
    }

    forkJoin({
      record: this.medicalRecordService.getByPatientId(patientId).pipe(catchError(() => of(null))),
      medicalAssessmentDone: this.assessmentService.getByPatient(patientId).pipe(
        map((reports) => reports.length > 0),
        catchError(() => of(false)),
      ),
      alzheimerDone: this.authService.getPatientAlzheimerAssessment(patientId).pipe(
        map((result) => !!result),
        catchError(() => of(false)),
      ),
    }).subscribe(({ record, medicalAssessmentDone, alzheimerDone }) => {
      if (!this.isMedicalRecordComplete(record) || !medicalAssessmentDone) {
        this.addCareCompletionTaskNotification(
          `medical-record-completion:${patientId}`,
          'Medical record reminder',
          isOwnProfile
            ? 'Your medical record or medical assessment is incomplete.'
            : `${patientLabel}'s medical record or medical assessment is incomplete.`,
        );
      }

      if (!alzheimerDone) {
        this.addCareCompletionTaskNotification(
          `alzheimer-completion:${patientId}`,
          'Alzheimer assessment reminder',
          isOwnProfile
            ? 'Your Alzheimer assessment is still waiting to be completed.'
            : `${patientLabel}'s Alzheimer assessment is still waiting to be completed.`,
        );
      }
    });
  }

  private isMedicalRecordComplete(record: unknown): boolean {
    if (!record || typeof record !== 'object') {
      return false;
    }

    const value = record as Record<string, unknown>;
    return ['bloodGroup', 'alzheimerStage', 'allergies', 'chronicDiseases', 'emergencyContactName', 'emergencyContactPhone']
      .every((field) => String(value[field] ?? '').trim().length > 0);
  }

  private addCareCompletionTaskNotification(key: string, title: string, message: string): void {
    const reminderKey = `${this.caregiverMedicalReminderKey}:${key}`;
    const lastReminder = Number(localStorage.getItem(reminderKey) || '0');
    if (Date.now() - lastReminder < this.caregiverMedicalReminderIntervalMs) {
      return;
    }

    localStorage.setItem(reminderKey, String(Date.now()));
    this.taskNotifications = [
      {
        id: `care-completion-${key}-${Date.now()}`,
        title,
        message,
        type: 'task',
        time: 'Just now',
        read: false,
        severity: 'MEDIUM',
      },
      ...this.taskNotifications,
    ];
    this.triggerNotificationCue();
    this.openCareReminderToast(title, message);
  }

  private openCareReminderToast(title: string, message: string): void {
    this.feedback.warning(message, title);
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

  private parseNotificationDetails(details: string): { message?: string; patientId?: string; patientName?: string; patientEmail?: string } {
    const value = String(details || '').trim();
    if (!value || !value.startsWith('{')) {
      return {};
    }

    try {
      const parsed = JSON.parse(value) as { message?: string; patientId?: string; patientName?: string; patientEmail?: string };
      return parsed || {};
    } catch {
      return {};
    }
  }

  private extractPatientIdFromActivity(activityId: string): string {
    const value = String(activityId || '').trim();
    if (!value.startsWith('medical-record-request:') && !value.startsWith('alzheimer-assessment-request:')) {
      return '';
    }
    return value
      .replace('medical-record-request:', '')
      .replace('alzheimer-assessment-request:', '')
      .split(':')[0]?.trim() || '';
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
