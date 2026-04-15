import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { Appointment } from '../../models/appointment';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
})
export class CalendarComponent implements OnInit, OnChanges {
  @Input() appointments: Appointment[] = [];
  @Input() currentDate: Date = new Date();
  @Output() monthChanged = new EventEmitter<Date>();
  @Output() dateSelected = new EventEmitter<string>();

  dayHeaders = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  days: { number: number; date: string; appointmentCount: number }[] = [];
  emptyCells: number[] = [];
  monthName: string = '';
  year: number = 2026;

  ngOnInit(): void {
    this.generateCalendar();

  }

  ngOnChanges(changes: SimpleChanges): void {
    if ( changes['currentDate']) {
      this.generateCalendar();

    }
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    this.monthName = this.currentDate.toLocaleString('fr-FR', { month: 'long' });
    this.year = year;
    this.emptyCells = Array(firstDay.getDay()).fill(0);

    this.days = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const appointmentCount = this.countAppointmentsForDate(dateStr);
      this.days.push({ number: i, date: dateStr, appointmentCount });
    }
  }

  countAppointmentsForDate(dateStr: string): number {
    return this.appointments.filter(apt => {
      const aptDate = apt.startDateTime.toISOString().split('T')[0];
      return aptDate === dateStr;
    }).length;
  }

  isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  getDayClass(dateStr: string): string {
    const baseClass = 'border-[#E5E7EB] hover:border-[#C4B5FD] hover:bg-[#FAF8FC]';
    return this.isToday(dateStr) ? 'border-[#7C3AED] bg-[#F3E8FF]' : baseClass;
  }

  previousMonth(): void {
    const newDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.monthChanged.emit(newDate);
  }

  nextMonth(): void {
    const newDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.monthChanged.emit(newDate);
  }
 onDateClick():void  {}
}
