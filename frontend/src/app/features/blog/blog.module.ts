import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Indispensable pour ngModel (recherche et formulaire admin)
import { BlogRoutingModule } from './blog-routing.module';
import { BlogComponent } from './pages/blog/blog.component';

@NgModule({
  declarations: [
    // On déclare notre composant ici
    BlogComponent
  ],
  imports: [
    CommonModule,
    BlogRoutingModule,
    FormsModule // Ajouté pour la gestion des inputs (searchQuery, newArticle...)
  ]
})
export class BlogModule { }
