import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- CETTE LIGNE MANQUAIT
import { CommunicationRoutingModule } from './communication-routing.module';
import { ChatComponent } from './pages/chat/chat.component';

@NgModule({
  declarations: [ChatComponent],
  imports: [
    CommonModule,
    FormsModule,
    CommunicationRoutingModule
  ],
  exports: [ChatComponent]

})
export class CommunicationModule { }
