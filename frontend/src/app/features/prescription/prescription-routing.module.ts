import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrescriptionPageComponent } from './pages/prescription-page/prescription-page.component';

const routes: Routes = [
  { path: '', component: PrescriptionPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrescriptionRoutingModule {}
