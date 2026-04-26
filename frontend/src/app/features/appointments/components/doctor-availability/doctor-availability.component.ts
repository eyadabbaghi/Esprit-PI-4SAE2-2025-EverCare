import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user';

@Component({
  selector: 'app-doctor-availability',

  templateUrl: './doctor-availability.component.html',
})
export class DoctorAvailabilityComponent implements OnInit {
  @Input() doctors: User[] = [];
  @Input() selectedDoctorId: string | null = null;
  @Output() doctorSelected = new EventEmitter<string>();

  selectedSpecialty: string = 'All';
  specialties: string[] = ['All', 'Neurologist', 'Geriatrician', 'Psychiatrist'];
  doctorAvailabilityMap: Map<string, {status: 'high' | 'medium' | 'low', nextSlots: string[]}> = new Map();

  ngOnInit() {
    this.initializeAvailabilityData();
  }

  private initializeAvailabilityData() {
    // In a real app, this would come from a service
    this.doctors.forEach(doctor => {
      const random = Math.random();
      let status: 'high' | 'medium' | 'low';
      if (random > 0.6) {
        status = 'high';
      } else if (random > 0.3) {
        status = 'medium';
      } else {
        status = 'low';
      }

      // Generate random next slots
      const numSlots = Math.floor(Math.random() * 3) + 1;
      const slots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
        .sort(() => 0.5 - Math.random())
        .slice(0, numSlots);

      this.doctorAvailabilityMap.set(doctor.userId || "",  { status, nextSlots: slots });
    });
  }

  get filteredDoctors(): User[] {

      return this.doctors;


  }

  selectDoctor(doctor: User) {
    this.doctorSelected.emit(doctor.userId);
  }

  getAvailabilityStatus(doctor: User): 'high' | 'medium' | 'low' {
    return this.doctorAvailabilityMap.get(doctor.userId || '')?.status || 'medium';
  }

  getAvailabilityText(doctor: User): string {
    const status = this.getAvailabilityStatus(doctor);
    return status === 'high' ? 'Available' :
      status === 'medium' ? 'Limited slots' : 'Almost full';
  }

  getNextSlots(doctor: User): string[] {
    return this.doctorAvailabilityMap.get(doctor.userId || "")?.nextSlots || [];
  }
}
