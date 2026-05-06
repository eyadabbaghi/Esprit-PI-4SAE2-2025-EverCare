import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message, Conversation, Call } from '../models/messages.model';
import { User } from '../../front-office/pages/login/auth.service';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private gatewayUrl = environment.apiUrl + '/communication-service/api';
  private webSocketUrl = environment.apiUrl.replace('http', 'ws') + '/ws-chat';
  public uploadUrl = environment.apiUrl + '/communication-service/uploads/';
  private stompClient: any;

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // ---------- WebSocket ----------
  watchMessages(conversationId: number): Observable<Message> {
    return new Observable(observer => {
      const socket = new (SockJS as any)(this.webSocketUrl);
      this.stompClient = new Client({ webSocketFactory: () => socket });
      this.stompClient.onConnect = () => {
        this.stompClient.subscribe(`/topic/messages/${conversationId}`, (payload: any) => {
          if (payload.body) observer.next(JSON.parse(payload.body));
        });
      };
      this.stompClient.onStompError = (error: any) => observer.error(error);
      this.stompClient.activate();
      return () => {
        if (this.stompClient && this.stompClient.connected) this.stompClient.deactivate();
      };
    });
  }

  watchCalls(conversationId: number): Observable<Call> {
    return new Observable(observer => {
      const socket = new (SockJS as any)(this.webSocketUrl);
      const callStompClient = new Client({ webSocketFactory: () => socket });
      callStompClient.onConnect = () => {
        callStompClient.subscribe(`/topic/calls/${conversationId}`, (payload: any) => {
          if (payload.body) observer.next(JSON.parse(payload.body));
        });
      };
      callStompClient.onStompError = (error: any) => observer.error(error);
      callStompClient.activate();
      return () => {
        if (callStompClient && callStompClient.connected) callStompClient.deactivate();
      };
    });
  }

  // ---------- Recherche globale ----------
  searchGlobalMessages(userEmail: string, query: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.gatewayUrl}/messages/search?query=${query}&email=${userEmail}`, { headers: this.getHeaders() });
  }

  // ---------- Utilisateurs (via proxy communication-service) ----------
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.gatewayUrl}/users/all`, { headers: this.getHeaders() });
  }

  getUserProfile(email: string): Observable<User> {
    return this.http.get<User>(`${this.gatewayUrl}/users/by-email?email=${email}`, { headers: this.getHeaders() });
  }

  getForbiddenWords(): Observable<string[]> {
    return this.http.get<string[]>(`${this.gatewayUrl}/messages/forbidden-words`);
  }

  // ---------- Conversations ----------
  getConversations(userEmail: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.gatewayUrl}/conversations/my?email=${userEmail}`, { headers: this.getHeaders() });
  }

  createConversation(user1Email: string, user2Email: string): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.gatewayUrl}/conversations`, { user1Id: user1Email, user2Id: user2Email }, { headers: this.getHeaders() });
  }

  archiveConversation(id: number): Observable<Conversation> {
    return this.http.put<Conversation>(`${this.gatewayUrl}/conversations/${id}/status?active=false`, {});
  }

  deleteConversation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.gatewayUrl}/conversations/${id}`);
  }

  // ---------- Messages ----------
  getMessages(conversationId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.gatewayUrl}/messages/conversation/${conversationId}`);
  }

  postMessage(conversationId: number, senderEmail: string, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.gatewayUrl}/messages/${conversationId}`, { senderId: senderEmail, content });
  }

  uploadFile(conversationId: number, file: File, senderEmail: string): Observable<Message> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('senderId', senderEmail);
    return this.http.post<Message>(`${this.gatewayUrl}/messages/${conversationId}/upload`, formData);
  }

  updateMessage(messageId: number, content: string): Observable<Message> {
    return this.http.put<Message>(`${this.gatewayUrl}/messages/${messageId}`, content, {
      headers: new HttpHeaders().set('Content-Type', 'text/plain')
    });
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.gatewayUrl}/messages/${messageId}`);
  }

  // ---------- Appels ----------
  startCall(conversationId: number, callerEmail: string): Observable<Call> {
    return this.http.post<Call>(`${this.gatewayUrl}/calls/${conversationId}?callerId=${callerEmail}`, {});
  }

  endCall(callId: number): Observable<Call> {
    return this.http.patch<Call>(`${this.gatewayUrl}/calls/end/${callId}`, {});
  }
} 
