import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface MessageHistory {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  patient_id?: string;
  message: string;
  history: MessageHistory[];
}

export interface ChatResponse {
  reply: string;
  suggested_action: string | null;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private apiUrl = environment.aiServiceUrl + '/api/chat';

  constructor(private http: HttpClient) {}

  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, request);
  }
}