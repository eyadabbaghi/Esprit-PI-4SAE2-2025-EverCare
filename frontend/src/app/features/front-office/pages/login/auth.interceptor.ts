import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const cleanedRequest = req.headers.has('skip-auth')
      ? req.clone({ headers: req.headers.delete('skip-auth') })
      : req;

    if (this.shouldSkipAuth(cleanedRequest)) {
      return next.handle(cleanedRequest);
    }

    const token = this.authService.getToken();
    if (!token) {
      return next.handle(cleanedRequest);
    }

    return next.handle(
      cleanedRequest.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      })
    );
  }

  private shouldSkipAuth(req: HttpRequest<any>): boolean {
    const publicPaths = [
      '/EverCare/auth/register',
      '/EverCare/auth/login',
      '/EverCare/auth/face-login',
      '/EverCare/users/by-email'
    ];

    return publicPaths.some((path) => req.url.includes(path));
  }
}
