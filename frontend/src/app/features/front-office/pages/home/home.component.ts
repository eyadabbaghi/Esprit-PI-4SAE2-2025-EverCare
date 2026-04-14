import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { AuthService } from '../login/auth.service'; // adjust path if needed

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
export class HomeComponent implements OnInit {
  showNewUserFlow = false;

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
      id: 'medical-record',
      title: 'Medical Record',
      description: 'Access your complete medical history and documents',
      icon: '📁',
      color: 'bg-[#DDD6FE]',
      gradient: 'from-[#DDD6FE] to-[#C4B5FD]',
      primaryRoute: '/medical-record',
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if we should show the new user flow (welcome + assessment)
    if (this.authService.isAuthenticated() && localStorage.getItem('showWelcomeFlow') === 'true') {
      this.showNewUserFlow = true;
    }

    // If the logged-in user is an admin, redirect to the admin dashboard
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user && user.role === 'ADMIN') {
        this.router.navigate(['/admin']);
      }
    });
  }

  navigate(card: HomeModuleCard): void {
    if (card.primaryRoute) {
      this.router.navigateByUrl(card.primaryRoute);
    }
  }

  startJourney(): void {
    this.router.navigateByUrl('/activities');
  }

  onNewUserFlowFinished(): void {
    this.showNewUserFlow = false;
  }
}
