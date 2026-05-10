import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppFeedbackType = 'success' | 'error' | 'info' | 'warning';
export type AppFeedbackTone = 'primary' | 'danger';

export interface AppFeedbackMessage {
  type: AppFeedbackType;
  title: string;
  message: string;
}

export interface AppFeedbackConfirm {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: AppFeedbackTone;
}

export interface AppFeedbackPrompt extends AppFeedbackConfirm {
  value: string;
  placeholder: string;
}

@Injectable({ providedIn: 'root' })
export class AppFeedbackService {
  readonly message$ = new BehaviorSubject<AppFeedbackMessage | null>(null);
  readonly confirm$ = new BehaviorSubject<AppFeedbackConfirm | null>(null);
  readonly prompt$ = new BehaviorSubject<AppFeedbackPrompt | null>(null);

  private messageTimer?: ReturnType<typeof setTimeout>;
  private confirmResolver?: (confirmed: boolean) => void;
  private promptResolver?: (value: string | null) => void;

  success(message: string, title = 'EverCare'): void {
    this.show('success', title, message);
  }

  error(message: string, title = 'EverCare'): void {
    this.show('error', title, message);
  }

  warning(message: string, title = 'EverCare'): void {
    this.show('warning', title, message);
  }

  info(message: string, title = 'EverCare'): void {
    this.show('info', title, message);
  }

  show(type: AppFeedbackType, title: string, message: string): void {
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }

    this.message$.next({ type, title, message });
    this.messageTimer = setTimeout(() => this.message$.next(null), 3600);
  }

  confirm(options: Partial<AppFeedbackConfirm> | string): Promise<boolean> {
    const config = typeof options === 'string'
      ? { message: options }
      : options;

    this.confirm$.next({
      title: config.title || 'Confirm action',
      message: config.message || 'Are you sure you want to continue?',
      confirmText: config.confirmText || 'Confirm',
      cancelText: config.cancelText || 'Cancel',
      tone: config.tone || 'primary'
    });

    return new Promise(resolve => {
      this.confirmResolver = resolve;
    });
  }

  resolveConfirm(confirmed: boolean): void {
    this.confirm$.next(null);
    this.confirmResolver?.(confirmed);
    this.confirmResolver = undefined;
  }

  prompt(options: Partial<AppFeedbackPrompt> | string): Promise<string | null> {
    const config = typeof options === 'string'
      ? { message: options }
      : options;

    this.prompt$.next({
      title: config.title || 'EverCare input',
      message: config.message || 'Enter a value to continue.',
      confirmText: config.confirmText || 'Save',
      cancelText: config.cancelText || 'Cancel',
      tone: config.tone || 'primary',
      value: config.value || '',
      placeholder: config.placeholder || ''
    });

    return new Promise(resolve => {
      this.promptResolver = resolve;
    });
  }

  resolvePrompt(value: string | null): void {
    this.prompt$.next(null);
    this.promptResolver?.(value);
    this.promptResolver = undefined;
  }
}
