import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TrackingStatus } from '../../services/tracking-dashboard.service';

type AssistantAction = 'use-current-location' | 'save-current-location' | 'open-add-safe-zone' | 'lost';

interface AssistantMessage {
  id: string;
  role: 'assistant' | 'patient';
  text: string;
  timestamp: string;
  tone: 'neutral' | 'warning' | 'danger';
}

@Component({
  selector: 'app-tracking-assistant',
  templateUrl: './tracking-assistant.component.html',
  styleUrls: ['./tracking-assistant.component.css']
})
export class TrackingAssistantComponent implements OnInit, OnChanges {
  @Input() patientId = 'default';
  @Input() mode: 'setup' | 'tracking' = 'setup';
  @Input() status: TrackingStatus = 'SAFE';
  @Input() lastZoneStatus: 'INSIDE' | 'OUTSIDE' | null = null;
  @Input() placesCount = 0;
  @Input() idleCounter = 0;
  @Input() currentLat = 0;
  @Input() currentLng = 0;

  @Output() actionSelected = new EventEmitter<AssistantAction>();

  isOpen = false;
  draftMessage = '';
  messages: AssistantMessage[] = [];

  readonly quickReplies = [
    'I am at home',
    'I feel safe',
    'Please save this place',
    'I need help'
  ];

  readonly quickActions: Array<{ label: string; action: AssistantAction }> = [
    { label: 'Use my location', action: 'use-current-location' },
    { label: 'Save this place', action: 'save-current-location' },
    { label: 'Add zone manually', action: 'open-add-safe-zone' },
    { label: "I'm lost", action: 'lost' }
  ];

  private suggestionKeys = new Set<string>();

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadMessages();
    this.loadSuggestionKeys();
    this.ensureWelcomeMessage();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!isPlatformBrowser(this.platformId)) return;

    if (changes['patientId'] && !changes['patientId'].firstChange) {
      this.messages = [];
      this.suggestionKeys.clear();
      this.loadMessages();
      this.loadSuggestionKeys();
      this.ensureWelcomeMessage();
    }
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
  }

  submitDraft() {
    const text = this.draftMessage.trim();
    if (!text) return;

    this.pushMessage('patient', text, 'neutral');
    this.draftMessage = '';
    this.replyToPatient(text);
  }

  sendQuickReply(reply: string) {
    this.pushMessage('patient', reply, 'neutral');
    this.replyToPatient(reply);
  }

  handleAction(action: AssistantAction) {
    this.actionSelected.emit(action);

    if (action === 'save-current-location') {
      this.pushAssistantMessage(
        'I opened the safe zone flow with your current position so you can confirm the radius.',
        'neutral'
      );
      return;
    }

    if (action === 'use-current-location') {
      this.pushAssistantMessage(
        'Using your latest location helps place the safe zone faster.',
        'neutral'
      );
      return;
    }

    if (action === 'lost') {
      this.pushAssistantMessage(
        'Follow the path to reach your safe zone.',
        'warning'
      );
      return;
    }

    this.pushAssistantMessage(
      'You can tap anywhere on the map or fill in the safe zone details manually.',
      'neutral'
    );
  }

  trackByMessage(_: number, message: AssistantMessage) {
    return message.id;
  }

  private ensureWelcomeMessage() {
    return;
  }

  private replyToPatient(text: string) {
    const normalized = text.toLowerCase();

    if (normalized.includes('help')) {
      this.pushAssistantMessage(
        'Please contact your care team if you need urgent help. I can also keep this page focused on your latest location and alerts.',
        'danger'
      );
      this.isOpen = true;
      return;
    }

    if (normalized.includes('save')) {
      this.actionSelected.emit('save-current-location');
      this.pushAssistantMessage(
        'I am preparing the current location for a new safe zone. You only need to review the label and radius.',
        'neutral'
      );
      return;
    }

    if (normalized.includes('home')) {
      this.pushAssistantMessage(
        'If this is home, tap "Save this place" and I will prefill it as a safe zone.',
        'neutral'
      );
      return;
    }

    if (normalized.includes('safe')) {
      this.pushAssistantMessage(
        'That is good to hear. I can still save this spot if you want faster monitoring next time.',
        'neutral'
      );
      return;
    }

    this.pushAssistantMessage(
      'I understood. You can use the quick actions below if you want me to help with safe zones.',
      'neutral'
    );
  }

  private pushContextMessage(
    key: string,
    text: string,
    tone: 'neutral' | 'warning' | 'danger',
    openPanel = false
  ) {
    if (this.suggestionKeys.has(key)) return;

    this.suggestionKeys.add(key);
    this.persistSuggestionKeys();
    this.pushAssistantMessage(text, tone);

    if (openPanel) {
      this.isOpen = true;
    }
  }

  private pushAssistantMessage(text: string, tone: 'neutral' | 'warning' | 'danger') {
    this.pushMessage('assistant', text, tone);
  }

  private pushMessage(
    role: 'assistant' | 'patient',
    text: string,
    tone: 'neutral' | 'warning' | 'danger'
  ) {
    const message: AssistantMessage = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      text,
      tone,
      timestamp: new Date().toISOString()
    };

    this.messages = [...this.messages, message].slice(-14);
    this.persistMessages();
  }

  private hasCoordinates() {
    return !!(this.currentLat || this.currentLng);
  }

  private loadMessages() {
    const rawMessages = localStorage.getItem(this.messagesStorageKey());

    if (!rawMessages) {
      this.messages = [];
      return;
    }

    try {
      const parsedMessages = JSON.parse(rawMessages);
      this.messages = Array.isArray(parsedMessages) ? parsedMessages : [];
    } catch {
      this.messages = [];
    }
  }

  private persistMessages() {
    localStorage.setItem(this.messagesStorageKey(), JSON.stringify(this.messages));
  }

  private loadSuggestionKeys() {
    const rawKeys = localStorage.getItem(this.flagsStorageKey());

    if (!rawKeys) {
      this.suggestionKeys = new Set<string>();
      return;
    }

    try {
      const parsedKeys = JSON.parse(rawKeys);
      this.suggestionKeys = new Set(Array.isArray(parsedKeys) ? parsedKeys : []);
    } catch {
      this.suggestionKeys = new Set<string>();
    }
  }

  private persistSuggestionKeys() {
    localStorage.setItem(this.flagsStorageKey(), JSON.stringify([...this.suggestionKeys]));
  }

  private messagesStorageKey() {
    return `tracking_assistant_messages_${this.patientId || 'default'}`;
  }

  private flagsStorageKey() {
    return `tracking_assistant_flags_${this.patientId || 'default'}`;
  }
}
