// dialog-header.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dialog-header',
  template: `
    <div
      class="flex flex-col gap-2 text-center sm:text-left"
      [class]="headerClass">
      <ng-content></ng-content>
    </div>
  `
})
export class DialogHeaderComponent {
  @Input() headerClass = '';
}
