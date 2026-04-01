import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { PrescriptionRoutingModule } from './prescription-routing.module';

import { PrescriptionPageComponent } from './pages/prescription-page/prescription-page.component';
import { PrescriptionListComponent } from './components/prescription-list/prescription-list.component';
import { PrescriptionCardComponent } from './components/prescription-card/prescription-card.component';
import { PrescriptionFormComponent } from './components/prescription-form/prescription-form.component';
import { PrescriptionDetailsComponent } from './components/prescription-details/prescription-details.component';
import { MedicationSelectorComponent } from './components/medication-selector/medication-selector.component';

@NgModule({
  declarations: [
    PrescriptionPageComponent,
    PrescriptionListComponent,
    PrescriptionCardComponent,
    PrescriptionFormComponent,
    PrescriptionDetailsComponent,
    MedicationSelectorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    PrescriptionRoutingModule
  ]
})
export class PrescriptionModule {}
