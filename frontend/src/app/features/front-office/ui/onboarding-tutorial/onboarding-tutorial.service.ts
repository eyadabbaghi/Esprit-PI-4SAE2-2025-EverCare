import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService, User } from '../../pages/login/auth.service';

export type TutorialRole = 'PATIENT' | 'CAREGIVER' | 'DOCTOR';

export interface TutorialStep {
  title: string;
  body: string;
  route: string;
  targetSelector: string;
}

export interface TutorialSession {
  role: TutorialRole;
  steps: TutorialStep[];
  index: number;
}

interface StoredTutorialState {
  role: TutorialRole;
  completed: boolean;
  skipped: boolean;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OnboardingTutorialService {
  private readonly sessionSubject = new BehaviorSubject<TutorialSession | null>(null);
  readonly session$ = this.sessionSubject.asObservable();

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  queueForCurrentUser(role?: string): void {
    const user = this.authService.getCurrentUserValue();
    const normalizedRole = this.normalizeRole(role || user?.role);
    if (!user || !normalizedRole) {
      return;
    }

    localStorage.setItem(this.pendingKey(user), 'true');
    this.saveState(user, {
      role: normalizedRole,
      completed: false,
      skipped: false,
      updatedAt: new Date().toISOString(),
    });
  }

  startPendingIfNeeded(): void {
    if (this.sessionSubject.value) {
      return;
    }

    const user = this.authService.getCurrentUserValue();
    const role = this.normalizeRole(user?.role);
    if (!user || !role || localStorage.getItem(this.pendingKey(user)) !== 'true') {
      return;
    }

    const state = this.readState(user);
    if (state?.completed) {
      localStorage.removeItem(this.pendingKey(user));
      return;
    }

    this.start(role);
  }

  restartForCurrentUser(): void {
    const user = this.authService.getCurrentUserValue();
    const role = this.normalizeRole(user?.role);
    if (!user || !role) {
      return;
    }

    localStorage.removeItem(this.pendingKey(user));
    this.saveState(user, {
      role,
      completed: false,
      skipped: false,
      updatedAt: new Date().toISOString(),
    });
    this.start(role);
  }

  next(): void {
    const session = this.sessionSubject.value;
    if (!session) {
      return;
    }

    if (session.index >= session.steps.length - 1) {
      this.complete();
      return;
    }

    this.setIndex(session.index + 1);
  }

  back(): void {
    const session = this.sessionSubject.value;
    if (!session || session.index === 0) {
      return;
    }

    this.setIndex(session.index - 1);
  }

  skip(): void {
    const user = this.authService.getCurrentUserValue();
    const session = this.sessionSubject.value;
    if (user && session) {
      localStorage.removeItem(this.pendingKey(user));
      this.saveState(user, {
        role: session.role,
        completed: false,
        skipped: true,
        updatedAt: new Date().toISOString(),
      });
    }
    this.sessionSubject.next(null);
  }

  complete(): void {
    const user = this.authService.getCurrentUserValue();
    const session = this.sessionSubject.value;
    if (user && session) {
      localStorage.removeItem(this.pendingKey(user));
      this.saveState(user, {
        role: session.role,
        completed: true,
        skipped: false,
        updatedAt: new Date().toISOString(),
      });
    }
    this.sessionSubject.next(null);
  }

  private start(role: TutorialRole): void {
    const steps = this.stepsForRole(role);
    this.sessionSubject.next({ role, steps, index: 0 });
    this.navigateToStep(steps[0]);
  }

  private setIndex(index: number): void {
    const session = this.sessionSubject.value;
    if (!session) {
      return;
    }

    const nextSession = { ...session, index };
    this.sessionSubject.next(nextSession);
    this.navigateToStep(nextSession.steps[index]);
  }

  private navigateToStep(step: TutorialStep): void {
    if (this.router.url === step.route || this.router.url.startsWith(`${step.route}?`)) {
      return;
    }
    this.router.navigateByUrl(step.route);
  }

  private normalizeRole(role?: string): TutorialRole | null {
    const normalized = role?.trim().toUpperCase();
    if (normalized === 'PATIENT' || normalized === 'CAREGIVER' || normalized === 'DOCTOR') {
      return normalized;
    }
    return null;
  }

  private stepsForRole(role: TutorialRole): TutorialStep[] {
    const sharedOpening: TutorialStep = {
      title: 'Welcome to your EverCare workspace',
      body: 'This quick tour shows the tools that matter most for your role. You can skip it now or restart it later from your profile menu.',
      route: '/',
      targetSelector: '#tutorial-nav-home',
    };

    const sharedClosing: TutorialStep = {
      title: 'Your profile and settings',
      body: 'Use your profile menu to update your account, restart this tutorial, change your password, or configure Face ID.',
      route: '/profile',
      targetSelector: '#profile-button',
    };

    const byRole: Record<TutorialRole, TutorialStep[]> = {
      PATIENT: [
        sharedOpening,
        {
          title: 'Daily Me',
          body: 'Track your daily tasks, mood, and care routine so your support network can understand how your day is going.',
          route: '/daily-me',
          targetSelector: '#tutorial-nav-daily-me',
        },
        {
          title: 'Activities',
          body: 'Find therapeutic activities designed to support memory, calm, and daily structure.',
          route: '/activities',
          targetSelector: '#tutorial-nav-activities',
        },
        {
          title: 'Appointments',
          body: 'View upcoming appointments and join medical visits from one place.',
          route: '/appointments',
          targetSelector: '#tutorial-nav-appointments',
        },
        {
          title: 'Doctors',
          body: 'Explore EverCare doctors, filter by country, pin profiles, and connect a doctor to your care team.',
          route: '/doctors',
          targetSelector: '#tutorial-nav-doctors',
        },
        {
          title: 'Prescriptions',
          body: 'Review your medications, today’s prescriptions, and treatment history.',
          route: '/prescriptions',
          targetSelector: '#tutorial-nav-prescriptions',
        },
        {
          title: 'Medical Record',
          body: 'Keep your medical history and assessments organized for your care team.',
          route: '/medical-record',
          targetSelector: '#tutorial-nav-medical-record',
        },
        {
          title: 'Cognitive Care',
          body: 'Open your cognitive stimulation plan and exercises connected to your care profile.',
          route: '/cognitive-stimulation',
          targetSelector: '#tutorial-nav-cognitive-stimulation',
        },
        {
          title: 'Alerts and safety',
          body: 'Use alerts for safety events, SOS support, and important care notifications.',
          route: '/alerts',
          targetSelector: '#tutorial-nav-alerts',
        },
        {
          title: 'Messages',
          body: 'Chat with your associated doctor and caregivers when you need support.',
          route: '/communication',
          targetSelector: '#tutorial-nav-communication',
        },
        {
          title: 'Tracking',
          body: 'Manage saved places and location safety tools connected to your care.',
          route: '/tracking/saved-places',
          targetSelector: '#tutorial-nav-tracking',
        },
        sharedClosing,
      ],
      CAREGIVER: [
        sharedOpening,
        {
          title: 'Alerts',
          body: 'Monitor patient safety alerts and respond quickly when a patient needs help.',
          route: '/alerts',
          targetSelector: '#tutorial-nav-alerts',
        },
        {
          title: 'Tracking',
          body: 'Follow associated patient location tools and safe-zone context from your caregiver dashboard.',
          route: '/tracking/caregiver',
          targetSelector: '#tutorial-nav-tracking',
        },
        {
          title: 'Appointments',
          body: 'Keep track of appointments for the patients you support.',
          route: '/appointments',
          targetSelector: '#tutorial-nav-appointments',
        },
        {
          title: 'Doctors',
          body: 'Find doctors and associate the right doctor with one of your connected patients.',
          route: '/doctors',
          targetSelector: '#tutorial-nav-doctors',
        },
        {
          title: 'Prescriptions',
          body: 'Review medication information for associated patients and help them stay on track.',
          route: '/prescriptions',
          targetSelector: '#tutorial-nav-prescriptions',
        },
        {
          title: 'Medical Record',
          body: 'Access patient records and assessment context when your permissions allow it.',
          route: '/medical-record',
          targetSelector: '#tutorial-nav-medical-record',
        },
        {
          title: 'Messages',
          body: 'Message associated patients and care-team members directly.',
          route: '/communication',
          targetSelector: '#tutorial-nav-communication',
        },
        {
          title: 'Cognitive Care',
          body: 'Review cognitive plans and games connected to the patient’s medical record.',
          route: '/cognitive-stimulation',
          targetSelector: '#tutorial-nav-cognitive-stimulation',
        },
        sharedClosing,
      ],
      DOCTOR: [
        sharedOpening,
        {
          title: 'Appointments',
          body: 'Manage your appointment schedule, patient visits, and availability.',
          route: '/appointments',
          targetSelector: '#tutorial-nav-appointments',
        },
        {
          title: 'Prescriptions',
          body: 'Create and manage patient prescriptions from your doctor workspace.',
          route: '/prescriptions',
          targetSelector: '#tutorial-nav-prescriptions',
        },
        {
          title: 'Medical Record',
          body: 'Review patient medical records, assessment reports, and care history.',
          route: '/medical-record',
          targetSelector: '#tutorial-nav-medical-record',
        },
        {
          title: 'Cognitive Care',
          body: 'Open the cognitive care catalog and patient-linked cognitive plans.',
          route: '/cognitive-stimulation/catalog',
          targetSelector: '#tutorial-nav-cognitive-stimulation',
        },
        {
          title: 'Messages',
          body: 'Chat with associated patients and caregivers from the messaging area.',
          route: '/communication',
          targetSelector: '#tutorial-nav-communication',
        },
        {
          title: 'Tracking',
          body: 'Use the doctor tracking dashboard to understand patient safety context.',
          route: '/tracking/doctor',
          targetSelector: '#tutorial-nav-tracking',
        },
        {
          title: 'Blog',
          body: 'Share educational posts and review care resources from the blog area.',
          route: '/blog',
          targetSelector: '#tutorial-nav-blog',
        },
        sharedClosing,
      ],
    };

    return byRole[role];
  }

  private readState(user: User): StoredTutorialState | null {
    try {
      const raw = localStorage.getItem(this.stateKey(user));
      return raw ? JSON.parse(raw) as StoredTutorialState : null;
    } catch {
      return null;
    }
  }

  private saveState(user: User, state: StoredTutorialState): void {
    localStorage.setItem(this.stateKey(user), JSON.stringify(state));
  }

  private stateKey(user: User): string {
    return `evercare_tutorial_state:${this.userIdentifier(user)}`;
  }

  private pendingKey(user: User): string {
    return `evercare_tutorial_pending:${this.userIdentifier(user)}`;
  }

  private userIdentifier(user: User): string {
    return (user.userId || user.email || user.name || 'user').trim().toLowerCase();
  }
}
