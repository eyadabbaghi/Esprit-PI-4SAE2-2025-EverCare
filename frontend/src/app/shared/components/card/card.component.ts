// card.component.ts
import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appCard]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      background: white;
    }
  `]
})
export class CardComponent {
  @HostBinding('class') className = '';
}
