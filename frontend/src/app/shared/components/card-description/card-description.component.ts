// card-description.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'p[appCardDescription]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      margin: 0;
      color: #64748b;
      font-size: 0.875rem;
    }
  `]
})
export class CardDescriptionComponent {
  @HostBinding('class') className = '';
}
