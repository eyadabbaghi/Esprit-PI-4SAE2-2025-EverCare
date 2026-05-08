import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Availability, AvailabilityStats } from '../../models/availability.model';

@Component({
  selector: 'app-availability-manager',
  templateUrl: 'availability-management.component.html',
})
export class AvailabilityManagerComponent implements OnInit {
  @Input() availabilities: Availability[] = [];
  @Input() stats: AvailabilityStats = {
    weeklyHours: 0,
    availableSlots: 0,
    bookedThisWeek: 0,
  };
  @Input() appointments: any[] = [];
  @Output() addAvailability = new EventEmitter<any>();
  @Output() editAvailability = new EventEmitter<Availability>();
  @Output() deleteAvailability = new EventEmitter<string>();
  @Input() doctorId: string = '';
  today: string = new Date().toISOString().split('T')[0];

  newAvailability: any = {
    dayCode: 'MONDAY',
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 20,
    validFromDate: new Date().toISOString().split('T')[0],
    validToDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    recurrence: 'WEEKLY',
    alzheimerFriendly: true
  };

  ngOnInit(): void {
    // Initialize if needed
  }
// In availability-manager.component.ts - update onAddAvailability method
  onAddAvailability(): void {
    const dayMap: Record<string, string> = {
      'MONDAY': 'Monday',
      'TUESDAY': 'Tuesday',
      'WEDNESDAY': 'Wednesday',
      'THURSDAY': 'Thursday',
      'FRIDAY': 'Friday',
      'SATURDAY': 'Saturday',
      'SUNDAY': 'Sunday'
    };

    if (!this.doctorId) {
      return;
    }

    if (!this.newAvailability.validFromDate || !this.newAvailability.validToDate) {
      return;
    }

    if (this.newAvailability.startTime >= this.newAvailability.endTime) {
      return;
    }

    const newSlot = {
      doctorId: this.doctorId,
      dayOfWeek: this.newAvailability.dayCode,
      startTime: this.newAvailability.startTime,
      endTime: this.newAvailability.endTime,
      slotDuration: this.newAvailability.slotDuration,
      validFrom: this.newAvailability.validFromDate,
      validTo: this.newAvailability.validToDate,
      recurrence: this.newAvailability.recurrence,
      isBlocked: false,
      blockReason: null,
      day: dayMap[this.newAvailability.dayCode]
    };

    this.addAvailability.emit(newSlot);

    // Reset form
    this.resetForm();
  }



  onEditAvailability(slot: Availability): void {
    this.editAvailability.emit(slot);
  }

  onDeleteAvailability(id: string): void {
    if (confirm('Are you sure you want to delete this availability slot?')) {
      this.deleteAvailability.emit(id);
    }
  }



  getDayName(dayCode: string): string {
    const days: Record<string, string> = {
      'MONDAY': 'Monday',
      'TUESDAY': 'Tuesday',
      'WEDNESDAY': 'Wednesday',
      'THURSDAY': 'Thursday',
      'FRIDAY': 'Friday',
      'SATURDAY': 'Saturday',
      'SUNDAY': 'Sunday'
    };
    return days[dayCode] || dayCode;
  }

  private resetForm() {
    this.newAvailability = {
      dayCode: 'MONDAY',
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 20,
      validFromDate: this.today,
      validToDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      recurrence: 'WEEKLY',
      alzheimerFriendly: true
    };
  }
}
