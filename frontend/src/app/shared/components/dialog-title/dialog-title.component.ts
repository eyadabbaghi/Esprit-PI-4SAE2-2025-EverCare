// dialog-title.component.ts
import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'h2[appDialogTitle]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: block;
      font-size: 1.125rem;
      line-height: 1;
      font-weight: 600;
    }
  `]
})
export class DialogTitleComponent {
  @Input() @HostBinding('class') className = '';
}
