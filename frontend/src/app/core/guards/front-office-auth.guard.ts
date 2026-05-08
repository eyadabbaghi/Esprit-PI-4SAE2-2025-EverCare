import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../features/front-office/pages/login/auth.service';

@Injectable({
  providedIn: 'root',
})
export class FrontOfficeAuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.validateSession();
  }

  canActivateChild(): Observable<boolean | UrlTree> {
    return this.validateSession();
  }

  private validateSession(): Observable<boolean | UrlTree> {
    if (!this.authService.getToken()) {
      return of(this.router.createUrlTree(['/login']));
    }

    const currentUser = this.authService.getCurrentUserValue();
    if (currentUser) {
      return of(true);
    }

    return this.authService.fetchCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.authService.logout();
        return of(false);
      }),
    );
  }
}
