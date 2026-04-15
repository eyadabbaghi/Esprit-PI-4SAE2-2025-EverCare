import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
})
export class FooterComponent {

  currentYear = new Date().getFullYear();

  quickLinks = [
    { name: 'Home', href: '#' },
    { name: 'About Us', href: '#' },
    { name: 'Services', href: '#' },
    { name: 'Resources', href: '#' },
    { name: 'Contact', href: '#' },
  ];

  features = [
    { name: 'Daily Tracking', icon: 'activity' },
    { name: 'GPS Monitoring', icon: 'map-pin' },
    { name: 'Appointments', icon: 'calendar' },
    { name: 'Care Team Chat', icon: 'message-circle' },
    { name: 'Memory Aids', icon: 'brain' },
    { name: 'Safety Alerts', icon: 'shield' },
  ];

  socialLinks = [
    { name: 'Facebook', icon: 'facebook', href: '#' },
    { name: 'Twitter', icon: 'twitter', href: '#' },
    { name: 'Instagram', icon: 'instagram', href: '#' },
    { name: 'LinkedIn', icon: 'linkedin', href: '#' },
    { name: 'YouTube', icon: 'youtube', href: '#' },
  ];
}
