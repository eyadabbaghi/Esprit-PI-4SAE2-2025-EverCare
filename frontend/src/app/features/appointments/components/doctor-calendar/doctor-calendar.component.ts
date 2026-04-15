import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Appointment } from '../../models/appointment';

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  appointments: Appointment[];
  appointmentCount: number;
}

@Component({
  selector: 'app-doctor-calendar',

  templateUrl:"doctor-calendar.component.html"
})
export class DoctorCalendarComponent implements OnInit, OnChanges {
  @Input() appointments: Appointment[] = [];
  @Input() initialDate: Date = new Date();
  @Output() dateSelected = new EventEmitter<string>();
  @Output() monthChanged = new EventEmitter<Date>();
  @Output() onAppointmentClick = new EventEmitter<Appointment>();

  currentDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  selectedDay: CalendarDay | null = null;

  dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthName: string = '';
  currentYear: number = 2026;

  ngOnInit(): void {
    this.currentDate = this.initialDate;
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appointments']) {
      this.generateCalendar();
    }
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    this.monthName = this.currentDate.toLocaleString('fr-FR', { month: 'long' });
    this.currentYear = year;

    // Get first day of month and last day
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get starting day of week (0 = Sunday)
    const startDay = firstDay.getDay();

    // Get total days in month
    const totalDays = lastDay.getDate();

    // Build calendar days array
    this.calendarDays = [];

    // Add previous month days if needed
    if (startDay > 0) {
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      for (let i = startDay - 1; i >= 0; i--) {
        const dayNumber = prevMonthLastDay - i;
        const date = new Date(year, month - 1, dayNumber);
        this.calendarDays.push(this.createCalendarDay(date, false));
      }
    }

    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      this.calendarDays.push(this.createCalendarDay(date, true));
    }

    // Add next month days to complete 6 rows (42 cells)
    const remainingCells = 42 - this.calendarDays.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      this.calendarDays.push(this.createCalendarDay(date, false));
    }
  }

  createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
    const today = new Date();
    const appointments = this.getAppointmentsForDate(date);

    return {
      date: date,
      dayNumber: date.getDate(),
      isCurrentMonth: isCurrentMonth,
      isToday: this.isSameDay(date, today),
      isSelected: this.selectedDay ? this.isSameDay(date, this.selectedDay.date) : false,
      appointments: appointments,
      appointmentCount: appointments.length
    };
  }

  getAppointmentsForDate(date: Date): Appointment[] {
    return this.appointments.filter(apt => {
      const aptDate = new Date(apt.startDateTime);
      return this.isSameDay(aptDate, date);
    });
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }

  getAppointmentIcons(day: CalendarDay): Appointment[] {
    return day.appointments.slice(0, 3);
  }

  getAppointmentTypeColor(appointment: Appointment): string {
    if (appointment.caregiverPresence === 'PHYSICAL' || appointment.caregiverPresence === 'REMOTE') {
      return 'bg-[#F97316]'; // Orange for appointments with caregiver
    } else if (appointment.caregiverPresence === 'NONE' && appointment.videoLink) {
      return 'bg-[#2D1B4E]'; // Dark purple for video calls
    } else {
      return 'bg-[#7C3AED]'; // Purple for in-person
    }
  }

  getDayClass(day: CalendarDay): string {
    const classes = [
      'aspect-square',
      'p-1',
      'rounded-lg',
      'border',
      'transition-all',
      'cursor-pointer'
    ];

    if (day.isToday && day.isSelected) {
      classes.push('border-[#7C3AED]', 'bg-[#F3E8FF]', 'border-2');
    } else if (day.isToday) {
      classes.push('border-[#7C3AED]', 'bg-[#F3E8FF]');
    } else if (day.isSelected) {
      classes.push('border-[#7C3AED]', 'bg-[#F3E8FF]');
    } else if (day.isCurrentMonth) {
      classes.push('border-[#E5E7EB]', 'hover:border-[#C4B5FD]', 'hover:bg-[#FAF8FC]');
    } else {
      classes.push('border-[#E5E7EB]', 'bg-[#F9FAFB]', 'text-[#6B5B8C]', 'opacity-60');
    }

    return classes.join(' ');
  }

  getDayNumberClass(day: CalendarDay): string {
    if (!day.isCurrentMonth) {
      return 'text-[#6B5B8C]';
    }
    if (day.isToday) {
      return 'text-[#7C3AED] font-bold';
    }
    return 'text-[#2D1B4E]';
  }

  selectDay(day: CalendarDay): void {
    // Deselect previous
    if (this.selectedDay) {
      this.selectedDay.isSelected = false;
    }

    // Select new day
    day.isSelected = true;
    this.selectedDay = day;

    // Emit date
    const dateStr = day.date.toISOString().split('T')[0];
    this.dateSelected.emit(dateStr);
  }

  previousMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.generateCalendar();
    this.monthChanged.emit(this.currentDate);

    // Clear selected day
    this.selectedDay = null;
  }

  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.generateCalendar();
    this.monthChanged.emit(this.currentDate);

    // Clear selected day
    this.selectedDay = null;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'SCHEDULED': 'bg-[#F3E8FF] text-[#7C3AED]',
      'CONFIRMED_BY_PATIENT': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'CONFIRMED_BY_CAREGIVER': 'bg-[#E6F0FA] text-[#2D1B4E]',
      'COMPLETED': 'bg-[#F1F5F9] text-[#6B5B8C]',
      'CANCELLED': 'bg-[#FEF2F2] text-[#C06C84]',
      'RESCHEDULED': 'bg-[#FFF3E0] text-[#F97316]',
      'MISSED': 'bg-[#FEF2F2] text-[#DC2626]'
    };
    return classes[status] || 'bg-[#F1F5F9] text-[#6B5B8C]';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'SCHEDULED': 'Scheduled',
      'CONFIRMED_BY_PATIENT': 'Confirmed',
      'CONFIRMED_BY_CAREGIVER': 'Confirmed',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'RESCHEDULED': 'Rescheduled',
      'MISSED': 'Missed'
    };
    return labels[status] || status;
  }
}
