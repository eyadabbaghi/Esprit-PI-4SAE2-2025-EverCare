import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, Input } from '@angular/core';
import { CheckService, CheckSignalMessage } from '../../services/check.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-patient-check',
  templateUrl: './patient-check.component.html',
  styleUrls: ['./patient-check.component.scss']
})
export class PatientCheckComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId!: string;
  @Input() caregiverId!: string;

  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;

  state: 'idle' | 'incoming' | 'streaming' | 'cancelled' = 'idle';
  retryCount = 0;
  private maxRetries = 3;

  private pc!: RTCPeerConnection;
  private localStream!: MediaStream;
  private sub!: Subscription;
  private retryTimer: any;
  private connected = false;

  // Queue candidates that arrive before setRemoteDescription
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(private checkService: CheckService) {}

  ngOnInit(): void {
    if (this.patientId) this.connectAndSubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] && this.patientId && !this.connected) {
      this.connectAndSubscribe();
    }
  }

  private connectAndSubscribe(): void {
    if (this.connected) return;
    this.connected = true;
    console.log('🟢 Patient connecting with userId:', this.patientId);
    this.checkService.connect(this.patientId);
    this.sub = this.checkService.signal$.subscribe(msg => this.handleSignal(msg));
  }

  private async handleSignal(msg: CheckSignalMessage): Promise<void> {
    if (msg.type === 'check-request') {
      this.state = 'incoming';
      this.retryCount = 0;
      this.pendingCandidates = [];
      this.speakPrompt("Hello! Your caregiver is checking on you. The camera will turn on shortly.");
      this.retryTimer = setTimeout(() => this.handleNoResponse(), 10000);

    } else if (msg.type === 'offer') {
      clearTimeout(this.retryTimer);
      await this.startCamera(msg);

    } else if (msg.type === 'ice-candidate') {
      if (this.pc?.remoteDescription) {
        await this.pc.addIceCandidate(new RTCIceCandidate(msg.payload));
      } else {
        // Queue it — will be flushed after setRemoteDescription
        console.log('📦 Patient queuing early ICE candidate');
        this.pendingCandidates.push(msg.payload);
      }

    } else if (msg.type === 'snapshot-request') {
      this.captureAndSendSnapshot();
    } else if (msg.type === 'voice-guide') {
      const text = typeof msg.payload?.text === 'string' ? msg.payload.text.trim() : '';
      if (text) {
        this.speakPrompt(text);
      }
    }
  }

  private speakPrompt(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }

  private async startCamera(offerMsg: CheckSignalMessage): Promise<void> {
    this.state = 'streaming';

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });
    this.localVideoRef.nativeElement.srcObject = this.localStream;

    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.pc.onconnectionstatechange = () =>
      console.log('🔗 Patient PC state:', this.pc.connectionState);
    this.pc.oniceconnectionstatechange = () =>
      console.log('🧊 Patient ICE state:', this.pc.iceConnectionState);

    this.localStream.getTracks().forEach(track => {
      console.log('🎥 Patient track:', track.kind, '| enabled:', track.enabled, '| readyState:', track.readyState);
      this.pc.addTrack(track, this.localStream);
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.checkService.send({
          type: 'ice-candidate',
          from: this.patientId,
          to: this.caregiverId,
          payload: event.candidate
        });
      }
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription(offerMsg.payload));

    // Flush any candidates that arrived before the offer was processed
    console.log(`🚿 Flushing ${this.pendingCandidates.length} queued patient candidates`);
    for (const candidate of this.pendingCandidates) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.pendingCandidates = [];

    // Fix transceiver direction: offer was recvonly → patient must sendonly
    this.pc.getTransceivers().forEach(t => {
      console.log('📡 Patient transceiver direction:', t.direction);
      if (t.direction === 'recvonly') t.direction = 'sendonly';
    });

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this.checkService.send({
      type: 'answer',
      from: this.patientId,
      to: this.caregiverId,
      payload: answer
    });
  }

  cancel(): void {
    clearTimeout(this.retryTimer);
    this.state = 'cancelled';
    this.stopCamera();
    this.checkService.send({
      type: 'cancel',
      from: this.patientId,
      to: this.caregiverId
    });
  }

  private handleNoResponse(): void {
    this.retryCount++;
    if (this.retryCount < this.maxRetries) {
      this.speakPrompt("Your caregiver is still checking on you. The camera will turn on.");
      this.retryTimer = setTimeout(() => this.handleNoResponse(), 10000);
    } else {
      this.checkService.send({
        type: 'cancel',
        from: this.patientId,
        to: this.caregiverId
      });
      this.state = 'idle';
    }
  }

  private captureAndSendSnapshot(): void {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      video.onplaying = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        stream.getTracks().forEach(t => t.stop());
        this.checkService.sendSnapshot({
          type: 'snapshot',
          from: this.patientId,
          to: this.caregiverId,
          payload: dataUrl
        });
      };
    });
  }

  private stopCamera(): void {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
  }

  ngOnDestroy(): void {
    clearTimeout(this.retryTimer);
    this.sub?.unsubscribe();
    this.stopCamera();
    this.checkService.disconnect();
  }
}
