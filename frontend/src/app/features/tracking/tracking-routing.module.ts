import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SavedPlacesComponent } from './pages/saved-places/saved-places.component';

const routes: Routes = [
  { path: 'saved-places', component: SavedPlacesComponent },
  { path: '', redirectTo: 'saved-places', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrackingRoutingModule {}