// select-value.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-select-value',
  template: `{{ value || label || placeholder }}`,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `]
})
export class SelectValueComponent {
  @Input() value: any;
  @Input() label: string = '';
  @Input() placeholder: string = '';
}
