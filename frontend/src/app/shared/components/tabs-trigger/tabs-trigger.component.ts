// tabs-trigger.component.ts
import { Component, Input, HostBinding, HostListener } from '@angular/core';

@Component({
  selector: 'button[appTabsTrigger]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      height: calc(100% - 0.125rem);
      padding: 0.25rem 0.75rem;
      border-radius: 0.75rem;
      border: 1px solid transparent;
      background: transparent;
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      color: #1e293b;
      transition: all 150ms;
      cursor: pointer;
      outline: none;
    }

    :host:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    :host.active {
      background: white;
      border-color: #e2e8f0;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    :host:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    :host:disabled {
      pointer-events: none;
      opacity: 0.5;
    }

    :host svg {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }
  `]
})
export class TabsTriggerComponent {
  @Input() value: string = '';
  @Input() disabled: boolean = false;
  @HostBinding('class.active') isActive: boolean = false;
  @HostBinding('attr.disabled') get disabledAttr() {
    return this.disabled ? 'disabled' : null;
  }
  @HostBinding('attr.aria-selected') get ariaSelected() {
    return this.isActive ? 'true' : 'false';
  }

  @HostListener('click')
  onClick() {
    if (!this.disabled) {
      // Émettre un événement ou notifier le parent
    }
  }
}
