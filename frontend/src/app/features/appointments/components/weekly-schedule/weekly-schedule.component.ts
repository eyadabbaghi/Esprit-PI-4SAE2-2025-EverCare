import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsultationType } from '../../models/consultation-type.model';

export interface TimeSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
  selected: boolean;
  type?: ConsultationType;
}

@Component({
  selector: 'app-weekly-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'weekly-schedule.component.html',
  styleUrls: ['weekly-schedule.component.css']
})
export class WeeklyScheduleComponent implements OnInit {
  @Input() doctorId: string | null = null;
  @Input() consultationTypes: ConsultationType[] = [];
  @Output() slotSelected = new EventEmitter<any>();

  currentDate: Date = new Date();
  weekDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  weekDates: Date[] = [];
  timeSlots: { time: string; slots: any[] }[] = [];

  ngOnInit() {
    this.generateWeekDates();
    this.generateTimeSlots();
  }

  get weekStart(): Date {
    return this.weekDates[0];
  }

  get weekEnd(): Date {
    return this.weekDates[6];
  }

  generateWeekDates() {
    const start = new Date(this.currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday

    this.weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      this.weekDates.push(date);
    }
  }

  generateTimeSlots() {
    // Generate time slots from 9 AM to 5 PM
    const times = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    this.timeSlots = times.map(time => ({
      time,
      slots: this.weekDates.map(date => ({
        id: `${date.toISOString()}-${time}`,
        date: date,
        time: time,
        available: this.isSlotAvailable(date, time),
        selected: false
      }))
    }));
  }

  isSlotAvailable(date: Date, time: string): boolean {
    // In a real app, this would check against actual availability data
    // For demo, make weekends unavailable and randomize
    if (date.getDay() === 0 || date.getDay() === 6) {
      return false; // Weekends unavailable
    }
    return Math.random() > 0.3; // 70% chance available
  }

  selectSlot(slot: any) {
    // Deselect previous slot
    if (this.timeSlots) {
      this.timeSlots.forEach(ts => {
        ts.slots.forEach(s => {
          if (s.selected) {
            s.selected = false;
          }
        });
      });
    }

    slot.selected = true;

    this.slotSelected.emit({
      date: slot.date,
      startTime: slot.time,
      endTime: this.calculateEndTime(slot.time)
    });
  }

  calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    let endMinutes = minutes + 20;
    let endHours = hours;

    if (endMinutes >= 60) {
      endHours += 1;
      endMinutes -= 60;
    }

    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  previousWeek() {
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.generateWeekDates();
    this.generateTimeSlots();
  }

  nextWeek() {
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.generateWeekDates();
    this.generateTimeSlots();
  }
}
