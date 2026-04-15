import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AiAssistantService, MessageHistory, ChatResponse } from './ai-assistant.service';

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
export class AiAssistantComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private msgContainer!: ElementRef;

  isOpen = false;
  showAssessment = false;
  showWelcome = false;
  userInput = '';
  isLoading = false;

  messages: DisplayMessage[] = [
    {
      role: 'assistant',
      content: "Hello! I'm your EverCare Assistant 💜 I'm here to help with daily activities, memory support, and Alzheimer's care guidance. How are you feeling today?",
    },
  ];

  private history: MessageHistory[] = [];

  constructor(private aiService: AiAssistantService) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('evercare_welcome_seen');
      this.showWelcome = !seen;
    }
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
}