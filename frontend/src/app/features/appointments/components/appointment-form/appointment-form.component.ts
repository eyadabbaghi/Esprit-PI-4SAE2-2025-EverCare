import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { User } from '../../models/user';
import { ConsultationType } from '../../models/consultation-type.model';

@Component({
  selector: 'app-appointment-form',
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.css'],
})
export class AppointmentFormComponent implements OnInit {
  @Input() title: string = 'Appointment details';
  @Input() subtitle: string = 'Confirm the visit information before booking.';
  @Input() submitText: string = 'Book appointment';
  @Input() doctors: User[] = [];
  @Input() consultationTypes: ConsultationType[] = [];
  @Input() caregivers: User[] = [];
  @Input() availableSlots: string[] = [];
  @Input() formData: any = {
    doctorId: '',
    consultationTypeId: '',
    date: '',
    time: '',
    caregiverId: '',
    caregiverPresence: 'NONE',
    notes: ''
  };

  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<any>();
  @Output() onDoctorChange = new EventEmitter<string>();
  @Output() onTypeChange = new EventEmitter<string>();
  @Output() onDateChange = new EventEmitter<string>();

  minDate: string = '';

  ngOnInit(): void {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  isValid(): boolean {
    return !!(
      this.formData.doctorId &&
      this.formData.consultationTypeId &&
      this.formData.date &&
      this.formData.time
    );
  }
}
