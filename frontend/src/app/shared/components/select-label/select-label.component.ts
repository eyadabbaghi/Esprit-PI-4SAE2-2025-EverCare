// select-label.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appSelectLabel]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: block;
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 500;
    }
  `]
})
export class SelectLabelComponent {
  @HostBinding('class') className: string = '';
}
