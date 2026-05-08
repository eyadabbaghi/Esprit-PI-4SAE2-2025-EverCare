// select-separator.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appSelectSeparator]',
  template: ``,
  styles: [`
    :host {
      display: block;
      height: 1px;
      margin: 0.25rem -0.25rem;
      background: #e2e8f0;
      pointer-events: none;
    }
  `]
})
export class SelectSeparatorComponent {
  @HostBinding('class') className: string = '';
}
