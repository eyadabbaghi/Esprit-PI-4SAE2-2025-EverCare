// select.component.ts
import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-select',
  template: `
    <div class="select-wrapper" [class.open]="isOpen">
      <!-- Trigger -->
      <div
        class="select-trigger"
        [class]="triggerClass"
        [attr.data-size]="size"
        (click)="toggleOpen()"
        (keydown)="onKeyDown($event)"
        tabindex="0"
        role="combobox"
        [attr.aria-expanded]="isOpen"
        [attr.aria-disabled]="disabled">

        <span class="select-value" [class.placeholder]="!selectedLabel">
          {{ selectedLabel || placeholder }}
        </span>

        <span class="select-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 9l6 6 6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>

      <!-- Dropdown -->
      <div class="select-content" *ngIf="isOpen" [class]="contentClass">
        <div class="select-viewport">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .select-wrapper {
      position: relative;
      width: 100%;
    }

    .select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      background: white;
      font-size: 0.875rem;
      color: #0f172a;
      cursor: pointer;
      outline: none;
      transition: all 150ms;
    }

    .select-trigger:hover {
      background: #f8fafc;
    }

    .select-trigger:focus-visible {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }

    .select-trigger[data-size="sm"] {
      height: 2rem;
      padding: 0.25rem 0.75rem;
    }

    .select-trigger[data-size="default"] {
      height: 2.25rem;
    }

    .select-trigger[aria-disabled="true"] {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .select-value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select-value.placeholder {
      color: #64748b;
    }

    .select-icon {
      display: flex;
      align-items: center;
      opacity: 0.5;
    }

    .select-icon svg {
      width: 1rem;
      height: 1rem;
    }

    .open .select-icon svg {
      transform: rotate(180deg);
    }

    .select-content {
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
      animation: slideIn 150ms ease;
    }

    .select-viewport {
      padding: 0.25rem;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-0.5rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() placeholder: string = 'Sélectionner...';
  @Input() size: 'sm' | 'default' = 'default';
  @Input() triggerClass: string = '';
  @Input() contentClass: string = '';
  @Input() disabled: boolean = false;

  @Output() valueChange = new EventEmitter<any>();
  @Output() openChange = new EventEmitter<boolean>();

  isOpen: boolean = false;
  selectedValue: any;
  selectedLabel: string = '';

  onChange: any = () => {};
  onTouched: any = () => {};

  toggleOpen() {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
      this.openChange.emit(this.isOpen);
    }
  }

  selectOption(value: any, label: string) {
    this.selectedValue = value;
    this.selectedLabel = label;
    this.isOpen = false;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleOpen();
    } else if (event.key === 'Escape') {
      this.isOpen = false;
    }
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    this.selectedValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
