import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsultationType } from '../../models/consultation-type.model';
import {ConsultationTypeService} from '../../services/consultation-type.service';

@Component({
  selector: 'app-consultation-type-manager',
  templateUrl:"consultation-type-manager.component.html"
})
export class ConsultationTypeManagerComponent {
 constructor(private consultationTypeService: ConsultationTypeService) {
 }
  @Input() types: ConsultationType[] = [];
  @Output() addType = new EventEmitter<any>();


  newType: any = {
    name: '',
    description: '',
    defaultDuration: 20,
    alzheimerDuration: 25,
    requiresCaregiver: false,
    environmentPreset: 'STANDARD',
    active: true
  };


  onAddType(): void {
    if (!this.newType.name || !this.newType.defaultDuration) {
      // You could emit an error event here
      return;
    }
    this.addType.emit(this.newType);
    console.log(this.newType);
    // Reset form
    this.newType = {
      name: '',
      description: '',
      defaultDuration: 20,
      alzheimerDuration: 25,
      requiresCaregiver: false,
      environmentPreset: 'STANDARD',
      active: true
    };
  }

  onEditType(type: ConsultationType): void {

  }

  onDeleteType(id: string): void {
    if (confirm('Are you sure you want to delete this consultation type?')) {

        console.log(`Deleting consultation type with ID: ${id}`);
        if (!id) return;

      this.consultationTypeService.deleteConsultationType(id).subscribe(
        {
          error: (error :Error) => {
            console.error('Error deleting consultation type:', error);
          }
        });
    }
    }


}
