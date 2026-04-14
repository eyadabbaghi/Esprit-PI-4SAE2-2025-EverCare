import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService, FaceLoginResponse } from '../../pages/login/auth.service';

@Injectable({ providedIn: 'root' })
export class FaceService {
  private authUrl = 'http://localhost:8089/EverCare/auth';

  constructor(private http: HttpClient, private authService: AuthService) {}

  setupFaceId(images: string[]): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    return this.http.post(`${this.authUrl}/setup-face-id`, { images }, { headers });
  }

  faceLogin(keycloakId: string, image: string): Observable<FaceLoginResponse> {
    return this.http.post<FaceLoginResponse>(`${this.authUrl}/face-login`, { keycloakId, image });
  }

  hasFaceId(): Observable<{ hasFaceId: boolean }> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    return this.http.get<{ hasFaceId: boolean }>(`${this.authUrl}/has-face-id`, { headers });
  }

  getUserByEmail(email: string): Observable<any> {
  const token = this.authService.getToken();
  
  if (token) {
    // Already have a token (post-login call) — use it normally
    return this.http.get<any>(
      `http://localhost:8089/EverCare/users/by-email`,
      { params: { email } }
    );
  } else {
    // Pre-login call — skip auth header
    return this.http.get<any>(
      `http://localhost:8089/EverCare/users/by-email`,
      {
        params: { email },
        headers: { 'skip-auth': 'true' }
      }
    );
  }
}

getUserByEmailNoAuth(email: string): Observable<any> {
  // Explicitly send request with no Authorization header
  // /users/by-email is permitAll() so no token needed
  return this.http.get<any>(
    `http://localhost:8089/EverCare/users/by-email`,
    {
      params: { email },
      headers: new HttpHeaders() // empty — no Authorization header at all
    }
  );
}
}
