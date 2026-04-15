import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/front-office/front-office.module').then(
        (m) => m.FrontOfficeModule,
      ),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/back-office/back-office.module').then(
        (m) => m.BackOfficeModule,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
