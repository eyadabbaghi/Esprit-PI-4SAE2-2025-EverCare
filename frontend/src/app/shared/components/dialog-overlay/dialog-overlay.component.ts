// dialog-overlay.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-dialog-overlay',
  template: `
    <div
      class="fixed inset-0 z-40 bg-black/50 animate-in fade-in"
      [class]="overlayClass"
      (click)="onClick.emit($event)">
    </div>
  `
})
export class DialogOverlayComponent {
  @Input() overlayClass = '';
  @Output() onClick = new EventEmitter<Event>();
}
