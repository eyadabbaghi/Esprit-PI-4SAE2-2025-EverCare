import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subscription } from 'rxjs';
import { AiAssistantService, MessageHistory, ChatResponse } from './ai-assistant.service';
import { AuthService, User } from '../../pages/login/auth.service';
import { EvercareRuntimeService } from '../../../../core/services/evercare-runtime.service';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css'],
})
export class AiAssistantComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private msgContainer!: ElementRef;

  isOpen = false;
  showAssessment = false;
  showWelcome = false;
  userInput = '';
  isLoading = false;
  private currentUser: User | null = null;
  private userSub?: Subscription;

  messages: DisplayMessage[] = [
    {
      role: 'assistant',
      content: "Hello! I'm your EverCare Assistant. I'm here to help with daily activities, memory support, and Alzheimer's care guidance. How are you feeling today?",
    },
  ];

  private history: MessageHistory[] = [];

  constructor(
    private aiService: AiAssistantService,
    private authService: AuthService,
    private evercareRuntime: EvercareRuntimeService,
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.syncWelcomeVisibility(user);
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    try {
      this.msgContainer.nativeElement.scrollTop =
        this.msgContainer.nativeElement.scrollHeight;
    } catch {}
  }

  toggleAssistant(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    if (this.isCaregiverContactRequest(text)) {
      this.triggerCaregiverContact(text);
      return;
    }

    this.messages.push({ role: 'user', content: text });
    this.userInput = '';
    this.isLoading = true;
    this.messages.push({ role: 'assistant', content: '', loading: true });

    this.aiService.sendMessage({
      message: text,
      history: [...this.history],
    }).subscribe({
      next: (res: ChatResponse) => {
        this.messages = this.messages.filter(m => !m.loading);
        this.messages.push({ role: 'assistant', content: res.reply });
        this.history.push({ role: 'user', content: text });
        this.history.push({ role: 'assistant', content: res.reply });
        this.handleAction(res.suggested_action);
        this.isLoading = false;
      },
      error: () => {
        this.messages = this.messages.filter(m => !m.loading);
        this.messages.push({
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        });
        this.isLoading = false;
      },
    });
  }

  handleAction(action: string | null): void {
    if (!action) return;
    if (action === 'OPEN_ASSESSMENT') setTimeout(() => this.openAssessment(), 800);
  }

  sendQuickMessage(text: string): void {
    this.userInput = text;
    this.sendMessage();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  openAssessment(): void {
    if (this.currentUser?.role !== 'PATIENT') {
      return;
    }
    this.showAssessment = true;
    this.isOpen = false;
  }

  closeAssessment(): void {
    this.showAssessment = false;
  }

  handleWelcomeCompleted(): void {
    this.showWelcome = false;
    localStorage.setItem('evercare_welcome_seen', 'true');
    this.isOpen = true;
  }

  handleWelcomeSkipped(): void {
    this.showWelcome = false;
    localStorage.setItem('evercare_welcome_seen', 'true');
  }

  private syncWelcomeVisibility(user: User | null): void {
    if (typeof window === 'undefined') {
      this.showWelcome = false;
      return;
    }

    const onboardingActive =
      localStorage.getItem('showAlzheimerAssessment') === 'true' ||
      localStorage.getItem('showWelcomeFlow') === 'true';

    if (!user || user.role !== 'PATIENT' || onboardingActive) {
      this.showWelcome = false;
      return;
    }

    this.showWelcome = localStorage.getItem('evercare_welcome_seen') !== 'true';
  }

  private isCaregiverContactRequest(text: string): boolean {
    const normalized = text.toLowerCase();
    return /contact\s+my\s+caregiver/.test(normalized) ||
      /call\s+my\s+caregiver/.test(normalized) ||
      /need\s+(to\s+)?(contact|call|reach)\s+my\s+caregiver/.test(normalized) ||
      /caregiver/.test(normalized) && /(help|emergency|sos|urgent|contact|call|reach)/.test(normalized);
  }

  private triggerCaregiverContact(text: string): void {
    this.messages.push({ role: 'user', content: text });
    this.userInput = '';

    if (this.currentUser?.role !== 'PATIENT') {
      this.messages.push({
        role: 'assistant',
        content: 'Emergency caregiver contact is available from a patient account. Please open the patient account or use the Alerts page SOS button.'
      });
      return;
    }

    const started = this.evercareRuntime.triggerPatientSos();
    this.messages.push({
      role: 'assistant',
      content: started
        ? 'I am contacting your caregiver now. The emergency SOS alert has been triggered, and your caregiver is being called.'
        : 'I am already contacting your caregiver. Please stay where you are if you can.'
    });

    this.history.push({ role: 'user', content: text });
    this.history.push({
      role: 'assistant',
      content: 'Emergency SOS caregiver contact was triggered.'
    });
  }
}
