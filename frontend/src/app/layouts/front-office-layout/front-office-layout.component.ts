import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-front-office-layout',
  templateUrl: './front-office-layout.component.html',
  styleUrl: './front-office-layout.component.css'
})
export class FrontOfficeLayoutComponent {
  constructor(private readonly router: Router) {}

  get hideNavigation(): boolean {
    const url = this.router.url;
    return url.includes('/login') || url.includes('/register');
  }
}
