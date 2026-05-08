// tabs-list.component.ts
import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appTabsList]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-flex;
      height: 2.25rem;
      width: fit-content;
      align-items: center;
      justify-content: center;
      border-radius: 0.75rem;
      padding: 0.1875rem;
      background: #f1f5f9;
    }
  `]
})
export class TabsListComponent {
  @HostBinding('class') className = '';
}
