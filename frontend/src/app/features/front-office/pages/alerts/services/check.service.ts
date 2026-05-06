// check.service.ts
import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject, firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';

export interface CheckSignalMessage {
  type: 'check-request' | 'offer' | 'answer' | 'ice-candidate' | 'cancel' | 'snapshot-request' | 'snapshot';
  from: string;
  to: string;
  payload?: any;
}

// check.service.ts
@Injectable({ providedIn: 'root' })
export class CheckService {
  private client!: Client;
  signal$ = new Subject<CheckSignalMessage>();
  private connected$ = new Subject<boolean>();
  private isConnected = false;
  private currentUserId: string | null = null;
  private refCount = 0; // ✅ track how many components are using the service

// check.service.ts
connect(userId: string): void {
  this.refCount++;
  if (this.currentUserId === userId && this.client?.active) return;
  if (this.client && !this.client.active) return;
  if (this.client?.active && this.isConnected) {
    this.subscribeForUser(userId);
    return;
  }

  this.client = new Client({
    // ✅ Pass userId as query param so handshake handler can read it
    brokerURL: `ws://${environment.apiUrl.replace('http://', '')}/ws-check?userId=${userId}`,
    reconnectDelay: 5000,
    debug: (str) => console.log('STOMP:', str),
    connectHeaders: {
      login: userId,
      passcode: userId,
    },
  });

  this.client.onConnect = () => {
    this.isConnected = true;
    this.connected$.next(true);
    this.subscribeForUser(userId);
  };

  this.client.onDisconnect = () => {
    this.isConnected = false;
    this.currentUserId = null;
  };

  this.client.onStompError = (frame) => console.error('STOMP error', frame);
  this.client.onWebSocketError = (error) => console.error('WebSocket error', error);
// check.service.ts — add this before activate()
console.log('🔌 Connecting with brokerURL:', `ws://${environment.apiUrl.replace('http://', '')}/ws-check?userId=${userId}`);
  this.client.activate();
}

  private subscribeForUser(userId: string): void {
  this.currentUserId = userId;
  // Use /user/queue/check — NOT /user/{userId}/queue/check
  // Spring resolves the principal internally to find the right session
  this.client.subscribe(
    `/user/queue/check`,
    (msg: IMessage) => this.signal$.next(JSON.parse(msg.body))
  );
  this.client.subscribe(
    `/user/queue/snapshot`,
    (msg: IMessage) => this.signal$.next(JSON.parse(msg.body))
  );
}

  waitForConnection(): Promise<void> {
    if (this.isConnected) return Promise.resolve();
    return firstValueFrom(
      this.connected$.pipe(filter(v => v === true), take(1))
    ).then(() => void 0);
  }

  send(message: CheckSignalMessage): void {
    if (!this.isConnected) {
      console.error('Cannot send: STOMP not connected');
      return;
    }
    this.client.publish({
      destination: '/app/check.signal',
      body: JSON.stringify(message),
    });
  }

  sendSnapshot(message: CheckSignalMessage): void {
    if (!this.isConnected) {
      console.error('Cannot send snapshot: STOMP not connected');
      return;
    }
    this.client.publish({
      destination: '/app/check.snapshot',
      body: JSON.stringify(message),
    });
  }

  // ✅ Only truly disconnect when no components are using it
  disconnect(): void {
    console.warn('disconnect() called, refCount before:', this.refCount, new Error().stack);
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.isConnected = false;
      this.currentUserId = null;
      this.client?.deactivate();
    }
  }
}