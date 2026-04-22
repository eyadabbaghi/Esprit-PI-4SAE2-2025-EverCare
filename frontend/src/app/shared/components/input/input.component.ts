// simple-input.component.ts
import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'input[appSimpleInput], textarea[appSimpleInput]',
  template: ``,
  styles: [`
    :host {
      width: 100%;
      min-width: 0;
      height: 2.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
      background: white;
      font-size: 0.875rem;
      outline: none;
    }

    :host:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    :host:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :host[aria-invalid="true"] {
      border-color: #ef4444;
    }

    :host[type="file"] {
      padding: 0.125rem 0.5rem;
    }

    :host[rows] {
      height: auto;
    }
  `]
})
export class InputComponent {
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() disabled = false;

  @HostBinding('attr.type')
  get typeAttr() {
    return this.type;
  }

  @HostBinding('attr.placeholder')
  get placeholderAttr() {
    return this.placeholder;
  }

  @HostBinding('attr.disabled')
  get disabledAttr() {
    return this.disabled ? 'disabled' : null;
  }
}
