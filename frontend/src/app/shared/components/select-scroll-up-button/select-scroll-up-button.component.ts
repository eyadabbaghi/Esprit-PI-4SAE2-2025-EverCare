// select-scroll-up-button.component.ts
import { Component, Input, HostBinding, HostListener } from '@angular/core';

@Component({
  selector: 'button[appSelectScrollUp]',
  template: `
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
    <ng-content></ng-content>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 0.5rem;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #64748b;
      transition: all 150ms;
      outline: none;
    }

    :host:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    :host:focus-visible {
      background: #f1f5f9;
      color: #0f172a;
    }

    :host svg {
      width: 1rem;
      height: 1rem;
    }

    :host:active {
      transform: scale(0.95);
    }
  `]
})
export class SelectScrollUpButtonComponent {
  @Input() className: string = '';
  @Input() disabled: boolean = false;

  @HostBinding('attr.aria-label') ariaLabel = 'Défiler vers le haut';
  @HostBinding('attr.type') type = 'button';
  @HostBinding('attr.disabled') get disabledAttr() {
    return this.disabled ? 'disabled' : null;
  }
  @HostBinding('class') get hostClass() {
    return this.className;
  }

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    if (this.disabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
