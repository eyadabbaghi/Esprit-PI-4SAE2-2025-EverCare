/*import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { Notification } from './notification.service'; // <-- import the correct interface

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private client: Client;
  public notifications$ = new Subject<Notification>();

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8089/EverCare/ws-notifications'),
      reconnectDelay: 5000,
      debug: (str) => console.log(str),
    });

    this.client.onConnect = () => {
      console.log('Connected to notification WebSocket');
      this.client.subscribe('/topic/notifications', (message: Message) => {
        const notification: Notification = JSON.parse(message.body); // <-- cast as Notification
        this.notifications$.next(notification);
      });
    };

    this.client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
    }
  }
}
  */