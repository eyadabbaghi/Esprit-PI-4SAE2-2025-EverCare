import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
  withFetch
} from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { LayoutsModule } from './layouts/layouts.module';

import { BackOfficeModule } from './features/back-office/back-office.module';
import { FrontOfficeModule } from './features/front-office/front-office.module';
import { AppointmentsModule } from './features/appointments/appointments.module';
import { DailyMeModule } from './features/daily-me/daily-me.module';

import { BackOfficeLayoutComponent } from './layouts/back-office-layout/back-office-layout.component';
import { SidebarComponent } from './layouts/back-office-layout/sidebar/sidebar.component';
import { NavbarComponent } from './layouts/back-office-layout/navbar/navbar.component';
import { FooterComponent } from './layouts/back-office-layout/footer/footer.component';
import { FrontOfficeLayoutComponent } from './layouts/front-office-layout/front-office-layout.component';
import { HeaderComponent } from './layouts/front-office-layout/header/header.component';
import { HeroComponent } from './layouts/front-office-layout/hero/hero.component';

import { LucideAngularModule, Heart, Mail, Lock, User, Chrome } from 'lucide-angular';
import { ToastrModule } from 'ngx-toastr';

import { AuthInterceptor } from './features/front-office/pages/login/auth.interceptor';

// ✅ ng2-charts v6 setup
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { TrackingModule } from './features/tracking/tracking.module';
import { DailymeAlertsComponent } from './pages/dailyme-alerts/dailyme-alerts.component';
import { DailymeAlertCardComponent } from './components/dailyme-alert-card/dailyme-alert-card.component';

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
    DailymeAlertsComponent,
    DailymeAlertCardComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,

    CoreModule,
    SharedModule,
    LayoutsModule,

    BackOfficeModule,
    FrontOfficeModule,
    AppointmentsModule,
    DailyMeModule,

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
    FormsModule,
    TrackingModule
  ],
  providers: [
    provideClientHydration(),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideCharts(withDefaultRegisterables()), // ✅ REQUIRED for charts
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}