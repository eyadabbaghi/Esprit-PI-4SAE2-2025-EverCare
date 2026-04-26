// card-title.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'h4[appCardTitle]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      margin: 0;
      line-height: 1;
      font-size: 1.125rem;
      font-weight: 600;
    }
  `]
})
export class CardTitleComponent {
  @HostBinding('class') className = '';
}
