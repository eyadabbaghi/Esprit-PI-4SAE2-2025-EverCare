// select-content.component.ts
import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'app-select-content',
  template: `
    <div class="select-content" [class]="className">
      <div class="select-viewport" [class.popper]="position === 'popper'">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      z-index: 50;
      min-width: 8rem;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 0.25rem;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
      background: white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .select-viewport {
      padding: 0.25rem;
    }

    .select-viewport.popper {
      width: 100%;
    }
  `]
})
export class SelectContentComponent {
  @Input() position: 'popper' | 'item-aligned' = 'popper';
  @Input() className: string = '';
  @HostBinding('attr.data-position') get dataPosition() { return this.position; }
}
