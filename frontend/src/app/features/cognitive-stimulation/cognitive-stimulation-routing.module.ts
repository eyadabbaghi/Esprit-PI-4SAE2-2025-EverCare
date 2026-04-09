import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CognitiveGamesCatalogComponent } from './pages/cognitive-games-catalog/cognitive-games-catalog.component';
import { CognitiveGamePlayerComponent } from './pages/cognitive-game-player/cognitive-game-player.component';
import { CognitivePlanComponent } from './pages/cognitive-plan/cognitive-plan.component';

const routes: Routes = [
  { path: '', component: CognitivePlanComponent },
  { path: 'catalog', component: CognitiveGamesCatalogComponent },
  { path: 'medical-record/:medicalRecordId', component: CognitivePlanComponent },
  { path: 'medical-record/:medicalRecordId/play/:gameId', component: CognitiveGamePlayerComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CognitiveStimulationRoutingModule { }
