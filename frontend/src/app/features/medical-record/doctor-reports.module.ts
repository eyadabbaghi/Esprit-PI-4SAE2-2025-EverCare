import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DoctorReportsRoutingModule } from './doctor-reports-routing.module';
import { DoctorReportsListComponent } from './pages/doctor-reports-list/doctor-reports-list.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    DoctorReportsListComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    DoctorReportsRoutingModule,
  ]
})
export class DoctorReportsModule { }
