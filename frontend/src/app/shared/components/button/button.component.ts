// button.component.ts
import { Component, Input, HostBinding } from '@angular/core';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

@Component({
  selector: 'button[appButton], a[appButton]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      white-space: nowrap;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 150ms;
      outline: none;
      border: none;
      cursor: pointer;
    }

    :host:disabled {
      pointer-events: none;
      opacity: 0.5;
    }

    /* Variants */
    :host([variant="default"]) {
      background: hsl(222.2 47.4% 11.2%);
      color: white;
    }
    :host([variant="default"]:hover) {
      background: hsl(222.2 47.4% 11.2% / 0.9);
    }

    :host([variant="destructive"]) {
      background: hsl(0 84.2% 60.2%);
      color: white;
    }
    :host([variant="destructive"]:hover) {
      background: hsl(0 84.2% 60.2% / 0.9);
    }

    :host([variant="outline"]) {
      border: 1px solid hsl(214.3 31.8% 91.4%);
      background: transparent;
      color: hsl(222.2 47.4% 11.2%);
    }
    :host([variant="outline"]:hover) {
      background: hsl(210 40% 96.1%);
    }

    :host([variant="secondary"]) {
      background: hsl(210 40% 96.1%);
      color: hsl(222.2 47.4% 11.2%);
    }
    :host([variant="secondary"]:hover) {
      background: hsl(210 40% 96.1% / 0.8);
    }

    :host([variant="ghost"]:hover) {
      background: hsl(210 40% 96.1%);
    }

    :host([variant="link"]) {
      color: hsl(222.2 47.4% 11.2%);
      text-underline-offset: 4px;
    }
    :host([variant="link"]:hover) {
      text-decoration: underline;
    }

    /* Sizes */
    :host([size="default"]) {
      height: 2.25rem;
      padding: 0.5rem 1rem;
    }

    :host([size="sm"]) {
      height: 2rem;
      padding: 0 0.75rem;
      gap: 0.375rem;
      border-radius: 0.5rem;
    }

    :host([size="lg"]) {
      height: 2.5rem;
      padding: 0 1.5rem;
      border-radius: 0.5rem;
    }

    :host([size="icon"]) {
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
    }

    /* Default variants */
    :host:not([variant]) {
      background: hsl(222.2 47.4% 11.2%);
      color: white;
    }
    :host:not([variant]):hover {
      background: hsl(222.2 47.4% 11.2% / 0.9);
    }

    :host:not([size]) {
      height: 2.25rem;
      padding: 0.5rem 1rem;
    }
  `]
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'default';
  @Input() size: ButtonSize = 'default';
  @Input() disabled = false;

  @HostBinding('attr.variant')
  get variantAttr() {
    return this.variant;
  }

  @HostBinding('attr.size')
  get sizeAttr() {
    return this.size;
  }

  @HostBinding('attr.disabled')
  get disabledAttr() {
    return this.disabled || null;
  }
}
