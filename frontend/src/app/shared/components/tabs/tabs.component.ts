// tabs.component.ts
import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'div[appTabs]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }
  `]
})
export class TabsComponent {
  @Input() defaultValue: string = '';
  @HostBinding('class') className = '';
}
