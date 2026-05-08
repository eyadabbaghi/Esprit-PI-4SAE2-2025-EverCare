import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-modern-date-picker',
  templateUrl: './modern-date-picker.component.html',
  styleUrls: ['./modern-date-picker.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ModernDatePickerComponent),
      multi: true,
    },
  ],
})
export class ModernDatePickerComponent implements ControlValueAccessor {
  @Input() min = '';
  @Input() max = '';
  @Input() placeholder = 'Select date';
  @Input() disabled = false;
  @Input() panelAlign: 'left' | 'right' = 'left';
  @Output() dateChange = new EventEmitter<string>();

  value = '';
  isOpen = false;
  currentCalendarDate = this.createDefaultCalendarDate();
  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get selectedDateLabel(): string {
    if (!this.value) {
      return this.placeholder;
    }

    const date = new Date(`${this.value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return this.placeholder;
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get currentCalendarLabel(): string {
    return `${this.monthNames[this.currentCalendarDate.getMonth()]} ${this.currentCalendarDate.getFullYear()}`;
  }

  get calendarYears(): number[] {
    const maxYear = this.max ? new Date(this.max).getFullYear() : new Date().getFullYear() + 10;
    const minYear = this.min ? new Date(this.min).getFullYear() : new Date().getFullYear() - 120;
    const years: number[] = [];
    for (let year = maxYear; year >= minYear; year--) {
      years.push(year);
    }
    return years;
  }

  get calendarDays(): Array<{ date: string; day: number; muted: boolean; disabled: boolean; selected: boolean }> {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateString = this.formatDateValue(date);
      return {
        date: dateString,
        day: date.getDate(),
        muted: date.getMonth() !== month,
        disabled: this.isDisabledDate(dateString),
        selected: this.value === dateString,
      };
    });
  }

  writeValue(value: string | null): void {
    this.value = value || '';
    this.syncCalendarToValue();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle(): void {
    if (this.disabled) return;
    this.syncCalendarToValue();
    this.isOpen = !this.isOpen;
  }

  close(): void {
    this.isOpen = false;
    this.onTouched();
  }

  previousMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() - 1,
      1
    );
  }

  nextMonth(): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      this.currentCalendarDate.getMonth() + 1,
      1
    );
  }

  changeCalendarMonth(monthIndex: string | number): void {
    this.currentCalendarDate = new Date(
      this.currentCalendarDate.getFullYear(),
      Number(monthIndex),
      1
    );
  }

  changeCalendarYear(year: string | number): void {
    this.currentCalendarDate = new Date(
      Number(year),
      this.currentCalendarDate.getMonth(),
      1
    );
  }

  selectCalendarDay(day: { date: string; disabled: boolean }): void {
    if (day.disabled) return;
    this.value = day.date;
    this.onChange(this.value);
    this.onTouched();
    this.dateChange.emit(this.value);
    this.isOpen = false;
  }

  private syncCalendarToValue(): void {
    if (!this.value) return;
    const selectedDate = new Date(`${this.value}T00:00:00`);
    if (!Number.isNaN(selectedDate.getTime())) {
      this.currentCalendarDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    }
  }

  private isDisabledDate(dateString: string): boolean {
    return (!!this.min && dateString < this.min) || (!!this.max && dateString > this.max);
  }

  private createDefaultCalendarDate(): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 30);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private formatDateValue(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }
}
