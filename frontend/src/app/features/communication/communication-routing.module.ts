import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatComponent } from './pages/chat/chat.component'; // Importation du composant

const routes: Routes = [
  { path: '', component: ChatComponent } // '' car le préfixe 'chat' est déjà géré par le parent
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CommunicationRoutingModule { }
