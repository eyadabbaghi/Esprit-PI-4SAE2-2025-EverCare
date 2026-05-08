import { Component, Inject, PLATFORM_ID, AfterViewInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { InactivityService } from './features/front-office/pages/services/inactivity/inactivity.service';
import { AuthService, User } from './features/front-office/pages/login/auth.service';

interface PageWelcome {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnDestroy {
  title = 'frontend';
  isRouteLoading = false;
  pageWelcome: PageWelcome | null = null;

  private routerSubscription?: Subscription;
  private loadingStartedAt = 0;
  private loadingHideTimer?: ReturnType<typeof setTimeout>;
  private pageWelcomeTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private inactivityService: InactivityService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.showPageLoader();
      this.loadingHideTimer = setTimeout(() => this.hidePageLoader(), 650);

      this.routerSubscription = this.router.events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.showPageLoader();
        }

        if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
          this.hidePageLoader();
        }

        if (event instanceof NavigationEnd) {
          this.queuePageWelcome(event.urlAfterRedirects);
        }
      });

      this.queuePageWelcome(this.router.url);

      // setTimeout pushes this out of SSR zone entirely
      setTimeout(() => {
        this.inactivityService.startLogoutWatcher();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();

    if (this.loadingHideTimer) {
      clearTimeout(this.loadingHideTimer);
    }

    if (this.pageWelcomeTimer) {
      clearTimeout(this.pageWelcomeTimer);
    }
  }

  dismissPageWelcome(): void {
    if (!this.pageWelcome || !isPlatformBrowser(this.platformId)) {
      this.pageWelcome = null;
      return;
    }

    localStorage.setItem(this.pageWelcomeStorageKey(this.pageWelcome.key), 'true');
    this.pageWelcome = null;
  }

  private showPageLoader(): void {
    if (this.loadingHideTimer) {
      clearTimeout(this.loadingHideTimer);
    }

    this.loadingStartedAt = Date.now();
    this.isRouteLoading = true;
  }

  private hidePageLoader(): void {
    const elapsed = Date.now() - this.loadingStartedAt;
    const remaining = Math.max(160, 520 - elapsed);

    if (this.loadingHideTimer) {
      clearTimeout(this.loadingHideTimer);
    }

    this.loadingHideTimer = setTimeout(() => {
      this.isRouteLoading = false;
    }, remaining);
  }

  private queuePageWelcome(url: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.pageWelcomeTimer) {
      clearTimeout(this.pageWelcomeTimer);
    }

    this.pageWelcome = null;
    this.pageWelcomeTimer = setTimeout(() => this.tryShowPageWelcome(url), 760);
  }

  private tryShowPageWelcome(url: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const transientOnboardingActive =
      localStorage.getItem('showWelcomeFlow') === 'true' ||
      localStorage.getItem('showAlzheimerAssessment') === 'true';

    if (transientOnboardingActive) {
      return;
    }

    const welcome = this.resolvePageWelcome(url);
    if (!welcome || localStorage.getItem(this.pageWelcomeStorageKey(welcome.key)) === 'true') {
      return;
    }

    this.pageWelcome = welcome;
    this.playPageWelcomeSound();
  }

  private pageWelcomeStorageKey(pageKey: string): string {
    const user = this.authService.getCurrentUserValue();
    const userKey = this.userWelcomeKey(user);
    return `evercare_page_welcome_seen:${userKey}:${pageKey}`;
  }

  private userWelcomeKey(user: User | null): string {
    return (user?.userId || user?.email || 'guest').trim().toLowerCase();
  }

  private resolvePageWelcome(url: string): PageWelcome | null {
    const cleanUrl = url.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
    const firstMatch = (items: PageWelcome[]) => items.find(item => this.matchesPage(cleanUrl, item.key)) || null;

    return firstMatch([
      {
        key: '/admin/medicaments/analytics',
        eyebrow: 'Admin medication analytics',
        title: 'Medication Insights',
        description: 'Review medication performance, top prescriptions, and care trends across the platform.'
      },
      {
        key: '/admin/medicaments/new',
        eyebrow: 'Admin medication editor',
        title: 'Add Medication',
        description: 'Create or update medication records so prescriptions stay accurate and easy to manage.'
      },
      {
        key: '/admin/medicaments',
        eyebrow: 'Admin medication center',
        title: 'Medication Management',
        description: 'Manage the medication catalog, images, dosage details, and platform medication data.'
      },
      {
        key: '/admin/activities',
        eyebrow: 'Admin activities',
        title: 'Activity Management',
        description: 'Create, edit, and review therapeutic activities that support patient routines and stimulation.'
      },
      {
        key: '/admin/blog',
        eyebrow: 'Admin blog',
        title: 'Blog Management',
        description: 'Publish care articles, manage categories, and keep educational content fresh for users.'
      },
      {
        key: '/admin/users',
        eyebrow: 'Admin users',
        title: 'User Management',
        description: 'Review platform accounts, manage admin users, and keep role-based access organized.'
      },
      {
        key: '/admin/analytics',
        eyebrow: 'Admin analytics',
        title: 'Platform Analytics',
        description: 'Track engagement, user growth, and operational health from one administrative overview.'
      },
      {
        key: '/admin/reports',
        eyebrow: 'Admin reports',
        title: 'Reports',
        description: 'Review submitted reports and patient-related documentation that need admin visibility.'
      },
      {
        key: '/admin/settings',
        eyebrow: 'Admin settings',
        title: 'Account Security',
        description: 'Update your password and manage sensitive administrator account actions.'
      },
      {
        key: '/admin/profile',
        eyebrow: 'Admin profile',
        title: 'Admin Profile',
        description: 'Review your administrator identity, contact details, and account status.'
      },
      {
        key: '/admin',
        eyebrow: 'Admin dashboard',
        title: 'Dashboard',
        description: 'Monitor users, activities, reports, and system highlights from your admin command center.'
      },
      {
        key: '/appointments/video',
        eyebrow: 'Appointments',
        title: 'Video Consultation',
        description: 'Join secure appointment calls and keep care conversations connected.'
      },
      {
        key: '/appointments',
        eyebrow: 'Appointments',
        title: 'Scheduling Center',
        description: 'Book, confirm, and manage appointments between patients, caregivers, and doctors.'
      },
      {
        key: '/prescriptions/doctor/analytics',
        eyebrow: 'Prescriptions',
        title: 'Prescription Analytics',
        description: 'Explore prescription trends, medication usage, and patient medication insights.'
      },
      {
        key: '/prescriptions/doctor/prescribe',
        eyebrow: 'Prescriptions',
        title: 'New Prescription',
        description: 'Choose an associated patient and create a clear medication plan.'
      },
      {
        key: '/prescriptions',
        eyebrow: 'Prescriptions',
        title: 'Medication Plans',
        description: 'Review active prescriptions, daily medication timing, and treatment history.'
      },
      {
        key: '/medical-record/new',
        eyebrow: 'Medical records',
        title: 'New Medical Record',
        description: 'Capture blood group, allergies, chronic diseases, and care history in a structured record.'
      },
      {
        key: '/medical-record',
        eyebrow: 'Medical records',
        title: 'Medical Journal',
        description: 'Read and manage patient medical records in a clear journal-style care history.'
      },
      {
        key: '/assessment',
        eyebrow: 'Assessment',
        title: 'Medical Record Assessment',
        description: 'Complete guided health questions to build a useful patient medical profile.'
      },
      {
        key: '/doctor',
        eyebrow: 'Doctor reports',
        title: 'Patient Reports',
        description: 'Review medical record assessment reports for associated patients.'
      },
      {
        key: '/cognitive-stimulation/catalog',
        eyebrow: 'Cognitive care',
        title: 'Game Catalog',
        description: 'Browse cognitive stimulation games designed to support memory, focus, and routine.'
      },
      {
        key: '/cognitive-stimulation',
        eyebrow: 'Cognitive care',
        title: 'Cognitive Stimulation',
        description: 'Follow personalized cognitive care plans and launch memory-support activities.'
      },
      {
        key: '/communication',
        eyebrow: 'Messages',
        title: 'Care Communication',
        description: 'Chat with associated patients, caregivers, and doctors in one coordinated space.'
      },
      {
        key: '/doctors',
        eyebrow: 'Care network',
        title: 'Explore Doctors',
        description: 'Search doctor profiles, filter by country, and connect associated doctors to your care team.'
      },
      {
        key: '/daily-me',
        eyebrow: 'Daily Me',
        title: 'Daily Care Journal',
        description: 'Track mood, daily notes, habits, and routines to build a clearer picture of each day.'
      },
      {
        key: '/tracking/doctor',
        eyebrow: 'Tracking',
        title: 'Doctor Tracking View',
        description: 'View associated patient safety locations and tracking context when care requires it.'
      },
      {
        key: '/tracking/caregiver',
        eyebrow: 'Tracking',
        title: 'Caregiver Tracking View',
        description: 'Monitor associated patient location context and safety zones from your caregiver workspace.'
      },
      {
        key: '/tracking',
        eyebrow: 'Tracking',
        title: 'Safe Places',
        description: 'Create and review safe zones that help protect patient movement and daily routines.'
      },
      {
        key: '/activities',
        eyebrow: 'Activities',
        title: 'Therapeutic Activities',
        description: 'Explore care activities, routines, and details that support engagement and wellbeing.'
      },
      {
        key: '/alerts',
        eyebrow: 'Alerts',
        title: 'Safety Alerts',
        description: 'Report incidents, monitor alerts, and keep safety responses visible to the care team.'
      },
      {
        key: '/profile',
        eyebrow: 'Profile',
        title: 'Your Profile',
        description: 'Manage personal information, face recognition, linked caregivers, doctors, and account settings.'
      },
      {
        key: '/blog',
        eyebrow: 'Blog',
        title: 'Care Articles',
        description: 'Read educational posts and updates about elderly care, wellness, and support.'
      },
      {
        key: '/setup-profile',
        eyebrow: 'Setup',
        title: 'Profile Setup',
        description: 'Complete your basic profile so EverCare can personalize your care experience.'
      },
      {
        key: '/setup-face-id',
        eyebrow: 'Setup',
        title: 'Face Recognition Setup',
        description: 'Add face recognition for faster and safer access to your account.'
      },
      {
        key: '/face-login',
        eyebrow: 'Login',
        title: 'Face Login',
        description: 'Use your saved face profile to sign in quickly and securely.'
      },
      {
        key: '/',
        eyebrow: 'Home',
        title: 'EverCare Home',
        description: 'Discover the EverCare care ecosystem and learn how patients, caregivers, and doctors stay connected.'
      }
    ]);
  }

  private matchesPage(url: string, key: string): boolean {
    if (key === '/') {
      return url === '/';
    }

    return url === key || url.startsWith(`${key}/`);
  }

  private playPageWelcomeSound(): void {
    try {
      const AudioContextRef = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextRef();
      const gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.055, audioContext.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.62);

      [440, 554.37, 659.25].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + index * 0.1);
        oscillator.connect(gain);
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.16);
      });

      setTimeout(() => audioContext.close(), 800);
    } catch {
      // Browser audio may be blocked until user interaction.
    }
  }
}
