import { Component, OnInit, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { InactivityService } from './features/front-office/pages/services/inactivity/inactivity.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  title = 'frontend';

  constructor(
    private inactivityService: InactivityService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
  if (isPlatformBrowser(this.platformId)) {
    // setTimeout pushes this out of SSR zone entirely
    setTimeout(() => {
      this.inactivityService.startLogoutWatcher();
    }, 0);
  }
}
}