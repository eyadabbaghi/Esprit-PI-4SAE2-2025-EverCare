// dialog-content.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dialog-content',
  template: `
    <div
      class="grid gap-4"
      [class]="contentClass">
      <ng-content></ng-content>
    </div>
  `
})
export class DialogContentComponent {
  @Input() contentClass = '';
}
