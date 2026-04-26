// dialog-close.component.ts
import { Component, Input, HostListener } from '@angular/core';
import {DialogComponent} from '../dialog/dialog.component';

@Component({
  selector: 'button[appDialogClose], div[appDialogClose]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-block;
      cursor: pointer;
    }
  `]
})
export class DialogCloseComponent {
  @Input() dialog!: DialogComponent;

  @HostListener('click')
  onClick(): void {
    if (this.dialog) {
      this.dialog.close();
    }
  }
}
