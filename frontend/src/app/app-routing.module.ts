import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/back-office/back-office.module').then(
        (m) => m.BackOfficeModule,
      ),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/front-office/front-office.module').then(
        (m) => m.FrontOfficeModule,
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
