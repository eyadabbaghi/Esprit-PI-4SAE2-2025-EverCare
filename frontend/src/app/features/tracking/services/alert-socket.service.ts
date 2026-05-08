import { Injectable } from '@angular/core';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

@Injectable({
  providedIn: 'root'
})
export class AlertSocketService {

  private stompClient: Client | null = null;

  connect(patientId: string, callback: (alert: any) => void) {

    const socket = new SockJS('http://localhost:8080/ws');

    this.stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 5000
    });

    this.stompClient.onConnect = () => {

      console.log("✅ WebSocket connected");

      this.stompClient?.subscribe(
        `/topic/alerts/${patientId}`,
        (message) => {
          const alert = JSON.parse(message.body);
          callback(alert);
        }
      );
    };

    this.stompClient.activate();
  }

  disconnect() {
    this.stompClient?.deactivate();
  }
}