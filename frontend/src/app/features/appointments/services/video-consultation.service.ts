// services/video-consultation.service.ts
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from '../../front-office/pages/login/auth.service';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface RoomInfo {
  roomId: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  caregiverId?: string;
  caregiverName?: string;
  participants: string[];
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

export interface SignalingMessage {
  type: string;
  senderId: string;
  targetId?: string;
  roomId: string;
  sdp?: string;
  candidate?: any;
}

@Injectable({
  providedIn: 'root'
})
export class VideoConsultationService {
  private apiUrl = "http://localhost:8089/EverCare/video";
  private stompClient: Client | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();

  public localStream$ = new BehaviorSubject<MediaStream | null>(null);
  public remoteStreams$ = new BehaviorSubject<Map<string, MediaStream>>(new Map());
  public participants$ = new BehaviorSubject<string[]>([]);
  public roomInfo$ = new BehaviorSubject<RoomInfo | null>(null);

  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;

  private iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.userId || null;
    });
  }

  // ========== ROOM MANAGEMENT ==========

  createRoom(appointmentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rooms`, {
      appointmentId,
      userId: this.currentUserId
    });
  }

  joinRoom(roomId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rooms/${roomId}/join`, {
      userId: this.currentUserId
    });
  }

  leaveRoom(roomId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rooms/${roomId}/leave`, {
      userId: this.currentUserId
    });
  }

  endRoom(roomId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/rooms/${roomId}/end`, {
      userId: this.currentUserId
    });
  }

  getRoom(roomId: string): Observable<RoomInfo> {
    return this.http.get<RoomInfo>(`${this.apiUrl}/rooms/${roomId}`);
  }

  getRoomByAppointment(appointmentId: string): Observable<RoomInfo> {
    return this.http.get<RoomInfo>(`${this.apiUrl}/appointments/${appointmentId}/room`);
  }

  // ========== WEBRTC ==========

  async initializeLocalStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      this.localStream$.next(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  connectWebSocket(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentRoomId = roomId;

      this.stompClient = new Client({
        webSocketFactory: () => new SockJS("http://localhost:8089/EverCare/ws-consultation"),
        connectHeaders: {
          Authorization: `Bearer ${this.authService.getToken()}`
        },
        onConnect: () => {
          console.log('✅ Connected to consultation server');

          // Subscribe to room topic
          this.stompClient!.subscribe(`/topic/room/${roomId}`, (message: IMessage) => {
            const signalingMessage: SignalingMessage = JSON.parse(message.body);
            this.ngZone.run(() => this.handleSignalingMessage(signalingMessage));
          });

          // Subscribe to private messages
          this.stompClient!.subscribe(`/user/${this.currentUserId}/queue/video`, (message: IMessage) => {
            const signalingMessage: SignalingMessage = JSON.parse(message.body);
            this.ngZone.run(() => this.handleSignalingMessage(signalingMessage));
          });

          // Announce join
          this.sendSignalingMessage({
            type: 'join',
            senderId: this.currentUserId!,
            roomId: roomId
          });

          resolve();
        },
        onStompError: (error) => {
          console.error('❌ WebSocket connection failed:', error);
          reject(error);
        }
      });

      this.stompClient.activate();
    });
  }

  disconnectWebSocket(): void {
    if (this.stompClient && this.stompClient.connected) {
      if (this.currentRoomId) {
        this.sendSignalingMessage({
          type: 'leave',
          senderId: this.currentUserId!,
          roomId: this.currentRoomId
        });
      }
      this.stompClient.deactivate();
    }
  }

  private sendSignalingMessage(message: SignalingMessage): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/video.signal',
        body: JSON.stringify(message)
      });
    }
  }

  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    console.log('📨 Signaling message:', message.type);

    switch (message.type) {
      case 'join':
        if (message.senderId !== this.currentUserId) {
          await this.initiateCall(message.senderId);
        }
        break;

      case 'offer':
        if (message.senderId !== this.currentUserId) {
          await this.handleOffer(message);
        }
        break;

      case 'answer':
        if (message.senderId !== this.currentUserId) {
          await this.handleAnswer(message);
        }
        break;

      case 'ice':
        if (message.senderId !== this.currentUserId) {
          await this.handleIceCandidate(message);
        }
        break;

      case 'participant-joined':
        this.updateParticipants();
        break;

      case 'participant-left':
        this.removeParticipantStream(message.senderId);
        break;

      case 'room-ended':
        this.cleanup();
        break;
    }
  }

  private async createPeerConnection(targetUserId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(this.iceServers);

    const localStream = this.localStream$.value;
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice',
          senderId: this.currentUserId!,
          targetId: targetUserId,
          roomId: this.currentRoomId!,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStreams$.value.set(targetUserId, remoteStream);
      this.remoteStreams$.next(new Map(this.remoteStreams$.value));
    };

    this.peerConnections.set(targetUserId, pc);
    return pc;
  }

  private async initiateCall(targetUserId: string): Promise<void> {
    const pc = await this.createPeerConnection(targetUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendSignalingMessage({
      type: 'offer',
      senderId: this.currentUserId!,
      targetId: targetUserId,
      roomId: this.currentRoomId!,
      sdp: offer.sdp
    });
  }

  private async handleOffer(message: SignalingMessage): Promise<void> {
    const pc = await this.createPeerConnection(message.senderId);
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: message.sdp
    }));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.sendSignalingMessage({
      type: 'answer',
      senderId: this.currentUserId!,
      targetId: message.senderId,
      roomId: this.currentRoomId!,
      sdp: answer.sdp
    });
  }

  private async handleAnswer(message: SignalingMessage): Promise<void> {
    const pc = this.peerConnections.get(message.senderId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: message.sdp
      }));
    }
  }

  private async handleIceCandidate(message: SignalingMessage): Promise<void> {
    const pc = this.peerConnections.get(message.senderId);
    if (pc && message.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
  }

  private removeParticipantStream(participantId: string): void {
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }

    this.remoteStreams$.value.delete(participantId);
    this.remoteStreams$.next(new Map(this.remoteStreams$.value));
    this.updateParticipants();
  }

  private updateParticipants(): void {
    // Updated from room info
  }

  toggleAudio(enabled: boolean): void {
    const stream = this.localStream$.value;
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = enabled);
    }
  }

  toggleVideo(enabled: boolean): void {
    const stream = this.localStream$.value;
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = enabled);
    }
  }

  cleanup(): void {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    const localStream = this.localStream$.value;
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    this.localStream$.next(null);
    this.remoteStreams$.next(new Map());
    this.disconnectWebSocket();
  }
}
