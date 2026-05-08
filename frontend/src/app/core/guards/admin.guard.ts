import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../features/front-office/pages/login/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate, CanActivateChild {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.validateAdminSession();
  }

  canActivateChild(): Observable<boolean> {
    return this.validateAdminSession();
  }

  private validateAdminSession(): Observable<boolean> {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    return this.authService.fetchCurrentUser().pipe(
      map(user => {
        if (user.role === 'ADMIN') {
          return true;
        }

        this.router.navigate(['/login']);
        return false;
      }),
      catchError(() => {
        this.authService.logout();
        return of(false);
      })
    );
  }
}
