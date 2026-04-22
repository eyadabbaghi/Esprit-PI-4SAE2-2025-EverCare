// select-trigger.component.ts
import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'button[appSelectTrigger], div[appSelectTrigger]',
  template: `
    <ng-content></ng-content>
    <span class="trigger-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M6 9l6 6 6-6" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </span>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      background: white;
      font-size: 0.875rem;
      color: #0f172a;
      cursor: pointer;
      outline: none;
    }

    :host:hover {
      background: #f8fafc;
    }

    :host:focus-visible {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    :host[data-size="sm"] {
      height: 2rem;
      padding: 0.25rem 0.75rem;
    }

    :host[data-size="default"] {
      height: 2.25rem;
    }

    :host[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .trigger-icon {
      display: flex;
      opacity: 0.5;
    }

    .trigger-icon svg {
      width: 1rem;
      height: 1rem;
    }

    :host[aria-expanded="true"] .trigger-icon svg {
      transform: rotate(180deg);
    }
  `]
})
export class SelectTriggerComponent {
  @Input() size: 'sm' | 'default' = 'default';
  @HostBinding('attr.data-size') get dataSize() { return this.size; }
  @HostBinding('attr.aria-expanded') expanded: boolean = false;
  @HostBinding('attr.disabled') @Input() disabled: boolean = false;
}
