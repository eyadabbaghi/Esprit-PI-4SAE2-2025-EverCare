import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MedicalRecordDetailsComponent } from './pages/medical-record-details/medical-record-details.component';
import { MedicalRecordFormComponent } from './pages/medical-record-form/medical-record-form.component';
import { MedicalRecordListComponent } from './pages/medical-record-list/medical-record-list.component';

const routes: Routes = [
  { path: '', component: MedicalRecordListComponent },
  { path: 'new', component: MedicalRecordFormComponent },
  { path: ':id/edit', component: MedicalRecordFormComponent },
  { path: ':id', component: MedicalRecordDetailsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MedicalRecordRoutingModule { }
