// card-header.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appCardHeader]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: grid;
      grid-template-rows: auto auto;
      align-items: start;
      gap: 0.375rem;
      padding: 1.5rem 1.5rem 0 1.5rem;
    }

    :host:has([appCardAction]) {
      grid-template-columns: 1fr auto;
    }

    :host-context(.border-bottom) {
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
  `]
})
export class CardHeaderComponent {
  @HostBinding('class') className = '';
}
