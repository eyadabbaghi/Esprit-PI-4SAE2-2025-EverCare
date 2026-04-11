import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { BackOfficeLayoutComponent } from './layouts/back-office-layout/back-office-layout.component';
import { SidebarComponent } from './layouts/back-office-layout/sidebar/sidebar.component';
import { NavbarComponent } from './layouts/back-office-layout/navbar/navbar.component';
import { FooterComponent } from './layouts/back-office-layout/footer/footer.component';
import { FrontOfficeLayoutComponent } from './layouts/front-office-layout/front-office-layout.component';
import { HeaderComponent } from './layouts/front-office-layout/header/header.component';
import { HeroComponent } from './layouts/front-office-layout/hero/hero.component';
import { LayoutsModule } from './layouts/layouts.module';
import { BackOfficeModule } from './features/back-office/back-office.module';
import { FrontOfficeModule } from './features/front-office/front-office.module';
import { AppointmentsModule } from './features/appointments/appointments.module';
import { LucideAngularModule, Heart, Mail, Lock, User, Chrome } from 'lucide-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';

// Import the interceptor
import { AuthInterceptor } from './features/front-office/pages/login/auth.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AddIncidentDialogComponent } from './add-incident-dialog/add-incident-dialog.component';
import { AddAlertDialogComponent } from './add-alert-dialog/add-alert-dialog.component';

// Angular Material imports
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { IncidentDetailsDialogComponent } from './features/front-office/pages/alerts/incident-details-dialog.component';
import { AlertAlarmComponent } from './alert-alarm/alert-alarm.component';

@NgModule({
  declarations: [
    AppComponent,
    BackOfficeLayoutComponent,
    SidebarComponent,
    NavbarComponent,
    FooterComponent,
    FrontOfficeLayoutComponent,
    HeaderComponent,
    HeroComponent,
    AddIncidentDialogComponent,
    AddAlertDialogComponent,
    IncidentDetailsDialogComponent, // <-- add here
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatRadioModule,
    HttpClientModule,
    CoreModule,
    SharedModule,
    LayoutsModule,
    BackOfficeModule,
    FrontOfficeModule,
    AppointmentsModule,
    LucideAngularModule.pick({ Heart, Mail, Lock, User, Chrome }),
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true,
      closeButton: true
    }),
    ReactiveFormsModule,
    // Angular Material modules
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  providers: [
    provideClientHydration(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideAnimationsAsync('noop')
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }