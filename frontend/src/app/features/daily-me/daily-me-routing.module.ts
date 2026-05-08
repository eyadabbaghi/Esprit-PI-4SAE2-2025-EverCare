import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DailyMeListComponent } from './daily-me-list/daily-me-list.component';

const routes: Routes = [
  {
    path: '',
    component: DailyMeListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DailyMeRoutingModule { }
