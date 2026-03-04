import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DoctorReportsRoutingModule } from './doctor-reports-routing.module';
import { DoctorReportsListComponent } from './pages/doctor-reports-list/doctor-reports-list.component';

@NgModule({
  declarations: [
    DoctorReportsListComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DoctorReportsRoutingModule,
  ]
})
export class DoctorReportsModule { }
