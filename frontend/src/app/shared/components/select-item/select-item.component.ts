// select-item.component.ts
import { Component, Input, HostBinding, HostListener, forwardRef } from '@angular/core';

@Component({
  selector: 'div[appSelectItem]',
  template: `
    <span class="item-text">
      <ng-content></ng-content>
    </span>
    <span class="item-check" *ngIf="selected">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  `,
  styles: [`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 2rem 0.375rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      color: #0f172a;
      cursor: default;
      outline: none;
    }

    :host:hover {
      background: #f1f5f9;
    }

    :host:focus-visible {
      background: #f1f5f9;
    }

    :host[data-disabled="true"] {
      opacity: 0.5;
      pointer-events: none;
    }

    .item-text {
      flex: 1;
    }

    .item-check {
      position: absolute;
      right: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
    }

    .item-check svg {
      width: 1rem;
      height: 1rem;
    }
  `]
})
export class SelectItemComponent {
  @Input() value: any = '';
  @Input() disabled: boolean = false;
  @HostBinding('attr.data-value') get dataValue() { return this.value; }
  @HostBinding('attr.data-disabled') get dataDisabled() { return this.disabled ? 'true' : 'false'; }
  @HostBinding('attr.aria-selected') selected: boolean = false;
  @HostBinding('class') className: string = '';

  @HostListener('click')
  onClick() {
    if (!this.disabled) {
      // Sélectionner l'item
    }
  }
}
