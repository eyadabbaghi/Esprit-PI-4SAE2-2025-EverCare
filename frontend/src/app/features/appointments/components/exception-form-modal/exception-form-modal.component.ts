import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exception-form-modal',
  templateUrl:'exception-form-modal.component.html'
})
export class ExceptionFormModalComponent {
  @Input() show: boolean = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<any>();

  today: string = new Date().toISOString().split('T')[0];

  exception: any = {
    type: 'VACATION',
    date: new Date().toISOString().split('T')[0],
    isFullDay: true,
    startTime: '09:00',
    endTime: '17:00',
    reason: ''
  };

  onSubmitClick(): void {
    this.onSubmit.emit(this.exception);
    this.resetForm();
  }

  private resetForm(): void {
    this.exception = {
      type: 'VACATION',
      date: new Date().toISOString().split('T')[0],
      isFullDay: true,
      startTime: '09:00',
      endTime: '17:00',
      reason: ''
    };
  }
}
