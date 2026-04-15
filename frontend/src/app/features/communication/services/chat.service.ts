import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message, Conversation, Call } from '../models/messages.model';
import { User } from '../../front-office/pages/login/auth.service';

// Imports pour le temps réel
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private gatewayUrl = 'http://localhost:8089/communication-service/api';
  private userApiUrl = 'http://localhost:8089/EverCare/users';

  // Point d'entrée WebSocket (Port 8085 pour test direct)
  private webSocketUrl = 'http://localhost:8085/ws-chat';

  public uploadUrl = 'http://localhost:8089/communication-service/uploads/';

  private stompClient: any;

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // --- LOGIQUE TEMPS RÉEL (WEBSOCKET) ---

  watchMessages(conversationId: number): Observable<Message> {
    return new Observable(observer => {
      const socket = new (SockJS as any)(this.webSocketUrl);
      this.stompClient = new Client({ webSocketFactory: () => socket });
      this.stompClient.onConnect = () => {
        this.stompClient.subscribe(`/topic/messages/${conversationId}`, (payload: any) => {
          if (payload.body) {
            const newMessage: Message = JSON.parse(payload.body);
            observer.next(newMessage);
          }
        });
      };
      this.stompClient.onStompError = (error: any) => {
        observer.error(error);
      };
      this.stompClient.activate();

      return () => {
        if (this.stompClient && this.stompClient.connected) {
          this.stompClient.deactivate();
        }
      };
    });
  }

  watchCalls(conversationId: number): Observable<Call> {
    return new Observable(observer => {
      const socket = new (SockJS as any)(this.webSocketUrl);
      const callStompClient = new Client({ webSocketFactory: () => socket });

      callStompClient.onConnect = () => {
        callStompClient.subscribe(`/topic/calls/${conversationId}`, (payload: any) => {
          if (payload.body) {
            observer.next(JSON.parse(payload.body));
          }
        });
      };
      callStompClient.onStompError = (error: any) => {
        observer.error(error);
      };
      callStompClient.activate();

      return () => {
        if (callStompClient && callStompClient.connected) {
          callStompClient.deactivate();
        }
      };
    });
  }

  // --- MÉTHODES API CLASSIQUES ---

  /**
   * RECHERCHE GLOBALE (Nouvelle fonctionnalité)
   * Recherche un mot-clé dans tous les messages des conversations de l'utilisateur
   */
  searchGlobalMessages(userId: string, query: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.gatewayUrl}/messages/search?userId=${userId}&query=${query}`);
  }

  getForbiddenWords(): Observable<string[]> {
    return this.http.get<string[]>(`${this.gatewayUrl}/messages/forbidden-words`);
  }

  getUserProfile(userId: string): Observable<User> {
    return this.http.get<User>(`${this.userApiUrl}/${userId}`, { headers: this.getHeaders() });
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.userApiUrl}/all`, { headers: this.getHeaders() });
  }

  getConversations(userId: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.gatewayUrl}/conversations/user/${userId}`);
  }

  createConversation(user1Id: string, user2Id: string): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.gatewayUrl}/conversations`, { user1Id, user2Id });
  }

  archiveConversation(id: number): Observable<Conversation> {
    return this.http.put<Conversation>(`${this.gatewayUrl}/conversations/${id}/status?active=false`, {});
  }

  deleteConversation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.gatewayUrl}/conversations/${id}`);
  }

  getMessages(conversationId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.gatewayUrl}/messages/conversation/${conversationId}`);
  }

  postMessage(conversationId: number, senderId: string, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.gatewayUrl}/messages/${conversationId}`, { senderId, content });
  }

  uploadFile(conversationId: number, file: File, senderId: string): Observable<Message> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('senderId', senderId);
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

  startCall(conversationId: number, callerId: string): Observable<Call> {
    return this.http.post<Call>(`${this.gatewayUrl}/calls/${conversationId}?callerId=${callerId}`, {});
  }

  endCall(callId: number): Observable<Call> {
    return this.http.patch<Call>(`${this.gatewayUrl}/calls/end/${callId}`, {});
  }
}
