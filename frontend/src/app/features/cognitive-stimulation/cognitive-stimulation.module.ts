import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CognitiveStimulationRoutingModule } from './cognitive-stimulation-routing.module';
import { CognitiveGamesCatalogComponent } from './pages/cognitive-games-catalog/cognitive-games-catalog.component';
import { CognitiveGamePlayerComponent } from './pages/cognitive-game-player/cognitive-game-player.component';
import { CognitivePlanComponent } from './pages/cognitive-plan/cognitive-plan.component';

@NgModule({
  declarations: [
    CognitiveGamesCatalogComponent,
    CognitivePlanComponent,
    CognitiveGamePlayerComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CognitiveStimulationRoutingModule,
  ]
})
export class CognitiveStimulationModule { }
