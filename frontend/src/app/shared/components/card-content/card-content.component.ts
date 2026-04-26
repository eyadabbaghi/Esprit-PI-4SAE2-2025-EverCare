// card-content.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appCardContent]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      padding: 0 1.5rem;
    }

    :host:last-child {
      padding-bottom: 1.5rem;
    }
  `]
})
export class CardContentComponent {
  @HostBinding('class') className = '';
}
