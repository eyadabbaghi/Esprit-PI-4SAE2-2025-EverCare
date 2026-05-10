import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsultationType } from '../../models/consultation-type.model';
import {ConsultationTypeService} from '../../services/consultation-type.service';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';

@Component({
  selector: 'app-consultation-type-manager',
  templateUrl:"consultation-type-manager.component.html"
})
export class ConsultationTypeManagerComponent {
 constructor(
   private consultationTypeService: ConsultationTypeService,
   private feedback: AppFeedbackService
 ) {
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

  async onDeleteType(id: string): Promise<void> {
    const confirmed = await this.feedback.confirm({
      title: 'Delete consultation type?',
      message: 'Remove this consultation type from the appointment workflow?',
      confirmText: 'Delete type',
      tone: 'danger'
    });

    if (confirmed) {

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
