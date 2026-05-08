// dialog-footer.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dialog-footer',
  template: `
    <div
      class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
      [class]="footerClass">
      <ng-content></ng-content>
    </div>
  `
})
export class DialogFooterComponent {
  @Input() footerClass = '';
}
