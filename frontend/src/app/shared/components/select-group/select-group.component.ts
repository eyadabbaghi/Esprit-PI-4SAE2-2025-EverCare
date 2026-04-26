// select-group.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-select-group',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SelectGroupComponent {}
