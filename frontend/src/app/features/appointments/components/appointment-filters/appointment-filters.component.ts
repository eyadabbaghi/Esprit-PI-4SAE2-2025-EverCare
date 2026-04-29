import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user';

@Component({
  selector: 'app-appointment-filters',
  templateUrl: './appointment-filters.component.html',
})
export class AppointmentFiltersComponent {
  @Input() doctors: User[] = [];
  @Input() showDoctorFilter: boolean = true;
  @Input() showReset: boolean = true;

  @Output() filtersChanged = new EventEmitter<{ status: string; doctorId: string }>();

  selectedStatus: string = '';
  selectedDoctorId: string = '';

  statusOptions = [
    { value: 'SCHEDULED', label: 'À confirmer' },
    { value: 'CONFIRMED_BY_PATIENT', label: 'Confirmé' },
    { value: 'COMPLETED', label: 'Terminé' },
    { value: 'CANCELLED', label: 'Annulé' }
  ];

  onFilterChange(): void {
    this.filtersChanged.emit({
      status: this.selectedStatus,
      doctorId: this.selectedDoctorId
    });
  }

  resetFilters(): void {
    this.selectedStatus = '';
    this.selectedDoctorId = '';
    this.onFilterChange();
  }
}
