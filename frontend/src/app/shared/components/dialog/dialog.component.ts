// dialog.component.ts
import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-dialog',
  template: `
    <ng-container *ngIf="open">
      <!-- Portal container -->
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Overlay -->
        <div
          class="fixed inset-0 bg-black/50 animate-in fade-in"
          (click)="onOverlayClick()"
          *ngIf="showOverlay !== false">
        </div>

        <!-- Content -->
        <div
          class="fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-white p-6 shadow-lg duration-200 animate-in fade-in zoom-in-95 sm:max-w-lg"
          [class]="contentClass">

          <ng-content></ng-content>

          <!-- Close button -->
          <button
            *ngIf="showCloseButton"
            class="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            (click)="close()"
            aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class DialogComponent {
  @Input() open = false;
  @Input() showOverlay = true;
  @Input() showCloseButton = true;
  @Input() contentClass = '';
  @Input() closeOnOverlayClick = true;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() afterOpen = new EventEmitter<void>();
  @Output() afterClose = new EventEmitter<void>();

  @ContentChild('dialogTrigger') triggerTemplate?: TemplateRef<any>;

  openDialog(): void {
    this.open = true;
    this.openChange.emit(true);
    this.afterOpen.emit();
  }

  close(): void {
    this.open = false;
    this.openChange.emit(false);
    this.afterClose.emit();
  }

  onOverlayClick(): void {
    if (this.closeOnOverlayClick) {
      this.close();
    }
  }
}
