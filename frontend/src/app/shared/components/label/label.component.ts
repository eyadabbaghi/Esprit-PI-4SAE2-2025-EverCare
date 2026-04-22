// label.component.ts
import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'label[appLabel]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      line-height: 1;
      font-weight: 500;
      user-select: none;
    }

    :host-context(.group:disabled, .group[data-disabled="true"]) :host,
    :host:has(:disabled) {
      pointer-events: none;
      opacity: 0.5;
    }
  `]
})
export class LabelComponent {
  @Input() for?: string;
  @Input() htmlFor?: string;

  @HostBinding('attr.for')
  get forAttr() {
    return this.for || this.htmlFor || null;
  }
}
