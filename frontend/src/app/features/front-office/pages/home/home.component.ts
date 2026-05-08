import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../login/auth.service';
import { AssessmentResult } from '../../ui/alzheimers-assessment/alzheimers-assessment.component';

interface HomeModuleCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  primaryRoute?: string;
}

interface HomeFeature {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  showAlzheimerAssessment = false;
  showNewUserFlow = false;
  private userSub?: Subscription;

  readonly modules: HomeModuleCard[] = [
    {
      id: 'daily-me',
      title: 'Daily Me',
      description: 'Track your mood, medications, and daily activities with ease',
      icon: '✨',
      color: 'bg-[#A78BFA]',
      gradient: 'from-[#A78BFA] to-[#7C3AED]',
    },
    {
      id: 'activities',
      title: 'Activities',
      description: 'Discover therapeutic activities and maintain daily routines',
      icon: '🏃',
      color: 'bg-[#7C3AED]',
      gradient: 'from-[#7C3AED] to-[#6D28D9]',
      primaryRoute: '/activities',
    },
    {
      id: 'appointments',
      title: 'Appointments',
      description: 'Schedule and manage medical appointments efficiently',
      icon: '📅',
      color: 'bg-[#C4B5FD]',
      gradient: 'from-[#C4B5FD] to-[#A78BFA]',
    },
    {
      id: 'medical-folder',
      title: 'Medical Folder',
      description: 'Access your complete medical history and documents',
      icon: '📁',
      color: 'bg-[#DDD6FE]',
      gradient: 'from-[#DDD6FE] to-[#C4B5FD]',
    },
    {
      id: 'alerts',
      title: 'Alerts & Incidents',
      description: 'Stay informed with real-time safety alerts and notifications',
      icon: '🔔',
      color: 'bg-[#EDE9FE]',
      gradient: 'from-[#EDE9FE] to-[#DDD6FE]',
      primaryRoute: '/alerts',
    },
  ];

  readonly features: HomeFeature[] = [
    {
      icon: '🛡️',
      title: 'Safety First',
      description: 'Advanced alert system with geo-fencing and SOS features',
    },
    {
      icon: '📍',
      title: 'Location Tracking',
      description: 'GPS tracking with safe zones for peace of mind',
    },
    {
      icon: '👥',
      title: 'Connected Care',
      description: 'Coordinate seamlessly between patients, caregivers, and doctors',
    },
    {
      icon: '❤️',
      title: 'AI Assistant',
      description: 'Intelligent guidance and recommendations when you need them',
    },
  ];

  constructor(
    private readonly router: Router,
    private authService: AuthService,
  ) {}

 ngOnInit(): void {
  this.userSub = this.authService.currentUser$.subscribe(user => {
    if (user?.role === 'ADMIN') {
      this.router.navigate(['/admin']);
      return;
    }

    this.syncPatientOnboarding(user);
  });
}

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  navigate(card: HomeModuleCard): void {
    if (card.primaryRoute) {
      this.router.navigateByUrl(card.primaryRoute);
    }
  }

  startJourney(): void {
    this.router.navigateByUrl('/activities');
  }

  scrollToVideo(): void {
    document.getElementById('evercare-video')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  // Called when Alzheimer assessment is completed with results
  onAlzheimerCompleted(result: AssessmentResult): void {
    this.showAlzheimerAssessment = false;
    localStorage.removeItem('showAlzheimerAssessment');
    if (localStorage.getItem('alzAssessmentReturnTo') === 'profile') {
      localStorage.removeItem('alzAssessmentReturnTo');
      localStorage.removeItem('showWelcomeFlow');
      this.router.navigate(['/profile']);
      return;
    }
    if (localStorage.getItem('showWelcomeFlow') === 'true') {
      this.showNewUserFlow = true;
    } else {
      this.router.navigate(['/assessment'], { queryParams: { source: 'onboarding' } });
    }
  }

  // Called when user skips the Alzheimer assessment
  onAlzheimerSkipped(): void {
    this.showAlzheimerAssessment = false;
    localStorage.removeItem('showAlzheimerAssessment');
    if (localStorage.getItem('alzAssessmentReturnTo') === 'profile') {
      localStorage.removeItem('alzAssessmentReturnTo');
      this.router.navigate(['/profile']);
      return;
    }
    if (localStorage.getItem('showWelcomeFlow') === 'true') {
      this.showNewUserFlow = true;
    } else {
      this.router.navigate(['/assessment'], { queryParams: { source: 'onboarding' } });
    }
  }

  // Called when welcome popup is finished — navigate to medical record assessment
onNewUserFlowFinished(): void {
  this.showNewUserFlow = false;
  localStorage.removeItem('showWelcomeFlow');
}

  private syncPatientOnboarding(user: User | null): void {
    const isPatient = user?.role === 'PATIENT';
    if (!this.authService.isAuthenticated() || !isPatient) {
      this.showAlzheimerAssessment = false;
      this.showNewUserFlow = false;
      return;
    }

    const showAlzheimer = localStorage.getItem('showAlzheimerAssessment') === 'true';
    const showWelcome = localStorage.getItem('showWelcomeFlow') === 'true';
    const hasPinnedAssessment = !!localStorage.getItem(this.assessmentStorageKey(user));

    this.showAlzheimerAssessment = showAlzheimer && !hasPinnedAssessment;
    this.showNewUserFlow = showWelcome && !this.showAlzheimerAssessment;
  }

  private assessmentStorageKey(user: User): string {
    const identifier = (user.userId || user.email || 'patient').trim().toLowerCase();
    return `assessmentResult:${identifier}`;
  }
}
