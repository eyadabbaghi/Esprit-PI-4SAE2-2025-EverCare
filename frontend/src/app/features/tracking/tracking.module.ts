import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackingRoutingModule } from './tracking-routing.module';
import { SavedPlacesComponent } from './pages/saved-places/saved-places.component';
import { ReactiveFormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps';

@NgModule({
  declarations: [
    SavedPlacesComponent
  ],
  imports: [
    CommonModule,
    TrackingRoutingModule,
    GoogleMapsModule,
    ReactiveFormsModule
  ]
})
export class TrackingModule { }