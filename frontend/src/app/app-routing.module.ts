import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [


  // ✅ 2) Admin
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/back-office/back-office.module').then(
        (m) => m.BackOfficeModule
      ),
  },

  // ✅ 3) Front-office last for ''
  {
    path: '',
    loadChildren: () =>
      import('./features/front-office/front-office.module').then(
        (m) => m.FrontOfficeModule
      ),
  },

  // ✅ 4) Wildcard always last
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}