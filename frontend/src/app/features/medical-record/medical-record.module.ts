import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';

import { MedicalRecordRoutingModule } from './medical-record-routing.module';
import { MedicalRecordListComponent } from './pages/medical-record-list/medical-record-list.component';
import { MedicalRecordFormComponent } from './pages/medical-record-form/medical-record-form.component';
import { MedicalRecordDetailsComponent } from './pages/medical-record-details/medical-record-details.component';
import { MedicalRecordCardComponent } from './components/medical-record-card/medical-record-card.component';


@NgModule({
  declarations: [
    MedicalRecordListComponent,
    MedicalRecordFormComponent,
    MedicalRecordDetailsComponent,
    MedicalRecordCardComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    MedicalRecordRoutingModule
  ]
})
export class MedicalRecordModule { }
