import { Component } from '@angular/core';

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css'],
})
export class AiAssistantComponent {
  isOpen = false;
  showAssessment = false;
  showWelcome = false;

  constructor() {
    // Show welcome tour only on first visit in the browser
    if (typeof window !== 'undefined') {
      const seen = window.localStorage.getItem('evercare_front_office_welcome_seen');
      this.showWelcome = !seen;
    }
  }

  toggleAssistant(): void {
    this.isOpen = !this.isOpen;
  }

  openAssessment(): void {
    this.showAssessment = true;
    this.isOpen = false;
  }

  closeAssessment(): void {
    this.showAssessment = false;
  }

  handleWelcomeCompleted(): void {
    this.showWelcome = false;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('evercare_front_office_welcome_seen', 'true');
    }
    // After the tour, gently open the assistant
    this.isOpen = true;
  }

  handleWelcomeSkipped(): void {
    this.showWelcome = false;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('evercare_front_office_welcome_seen', 'true');
    }
  }
}

