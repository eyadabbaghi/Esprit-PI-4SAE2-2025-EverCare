import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token for registration endpoint (still called to your backend)
    if (req.url.includes('/auth/register')) {
      return next.handle(req);
    }

    // For all other requests, add the token if available
    const token = this.authService.getToken();
    const currentUser = this.authService.getCurrentUserValue();
    if (token) {
      let headers = req.headers.set('Authorization', `Bearer ${token}`);

      if (currentUser?.userId && !headers.has('X-User-Id')) {
        headers = headers.set('X-User-Id', currentUser.userId);
      }

      if (currentUser?.role && !headers.has('X-User-Role')) {
        headers = headers.set('X-User-Role', currentUser.role);
      }

      const cloned = req.clone({ headers });
      return next.handle(cloned);
    }
    return next.handle(req);
  }
}
