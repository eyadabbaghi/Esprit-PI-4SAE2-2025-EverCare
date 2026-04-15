// dialog-trigger.component.ts
import { Component, Input, HostListener } from '@angular/core';
import {DialogComponent} from '../dialog/dialog.component';

@Component({
  selector: 'button[appDialogTrigger], div[appDialogTrigger]',
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-block;
      cursor: pointer;
    }
  `]
})
export class DialogTriggerComponent {
  @Input() dialog!: DialogComponent;

  @HostListener('click')
  onClick(): void {
    if (this.dialog) {
      this.dialog.openDialog();
    }
  }
}
