// card-action.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appCardAction]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      grid-column: 2;
      grid-row: span 2 / span 2;
      grid-row-start: 1;
      align-self: start;
      justify-self: end;
    }
  `]
})
export class CardActionComponent {
  @HostBinding('class') className = '';
}
