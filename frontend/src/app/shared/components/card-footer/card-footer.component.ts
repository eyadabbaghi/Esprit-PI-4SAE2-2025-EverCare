// card-footer.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appCardFooter]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      padding: 0 1.5rem 1.5rem 1.5rem;
    }

    :host-context(.border-top) {
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
    }
  `]
})
export class CardFooterComponent {
  @HostBinding('class') className = '';
}
