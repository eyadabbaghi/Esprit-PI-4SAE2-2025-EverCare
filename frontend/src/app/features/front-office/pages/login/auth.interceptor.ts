import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token for public endpoints or explicitly flagged requests
    if (
      req.url.includes('/auth/register') ||
      req.url.includes('/auth/face-login') ||
      req.url.includes('/users/by-email') ||   // ← add this
      req.headers.has('skip-auth')
    ) {
      const cleanReq = req.clone({
        headers: req.headers.delete('skip-auth')
      });
      return next.handle(cleanReq);
    }

    const token = this.authService.getToken();
    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}