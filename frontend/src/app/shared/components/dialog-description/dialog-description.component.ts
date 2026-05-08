// dialog-description.component.ts
import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'p[appDialogDescription]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: block;
      font-size: 0.875rem;
      color: #64748b;
    }
  `]
})
export class DialogDescriptionComponent {
  @Input() @HostBinding('class') className = '';
}
