import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CheckService, CheckSignalMessage } from '../../services/check.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-caregiver-check',
  templateUrl: './caregiver-check.component.html',
  styleUrls: ['./caregiver-check.component.scss']
})
export class CaregiverCheckComponent implements OnInit, OnDestroy {
  @Input() caregiverId!: string;
  @Input() patientId!: string;
  @Input() patientName!: string;

  @Output() statusChange = new EventEmitter<string>();

  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  status: 'idle' | 'waiting' | 'streaming' | 'cancelled' | 'snapshot' = 'idle';
  snapshotImage: string | null = null;

  private pc!: RTCPeerConnection;
  private sub!: Subscription;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(
    private checkService: CheckService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkService.connect(this.caregiverId);
    this.sub = this.checkService.signal$.subscribe(msg => this.handleSignal(msg));
  }

  async startCheck(): Promise<void> {
    console.log('🔵 Caregiver sending to patientId:', this.patientId);
    this.setStatus('waiting');
    this.snapshotImage = null;
    this.pendingCandidates = [];

    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.pc.onconnectionstatechange = () =>
      console.log('🔗 Caregiver PC state:', this.pc.connectionState);
    this.pc.oniceconnectionstatechange = () =>
      console.log('🧊 Caregiver ICE state:', this.pc.iceConnectionState);

    this.pc.ontrack = (event) => {
      console.log('🎬 Caregiver ontrack — kind:', event.track.kind,
        '| readyState:', event.track.readyState,
        '| muted:', event.track.muted);

      this.setStatus('streaming');
      this.cdr.detectChanges();

      if (this.remoteVideoRef?.nativeElement) {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        this.remoteVideoRef.nativeElement.srcObject = stream;
        this.remoteVideoRef.nativeElement.play().catch(e =>
          console.error('▶️ play() failed:', e)
        );
      }
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.checkService.send({
          type: 'ice-candidate',
          from: this.caregiverId,
          to: this.patientId,
          payload: event.candidate
        });
      }
    };

    this.pc.addTransceiver('video', { direction: 'recvonly' });

    await this.checkService.waitForConnection();

    this.checkService.send({
      type: 'check-request',
      from: this.caregiverId,
      to: this.patientId
    });

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.checkService.send({
      type: 'offer',
      from: this.caregiverId,
      to: this.patientId,
      payload: offer
    });
  }

  private async handleSignal(msg: CheckSignalMessage): Promise<void> {
    if (msg.type === 'answer') {
      console.log('📨 Caregiver received answer, flushing', this.pendingCandidates.length, 'queued candidates');
      await this.pc?.setRemoteDescription(new RTCSessionDescription(msg.payload));

      for (const candidate of this.pendingCandidates) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingCandidates = [];

    } else if (msg.type === 'ice-candidate') {
      if (this.pc?.remoteDescription) {
        await this.pc.addIceCandidate(new RTCIceCandidate(msg.payload));
      } else {
        console.log('📦 Caregiver queuing early ICE candidate');
        this.pendingCandidates.push(msg.payload);
      }

    } else if (msg.type === 'cancel') {
      this.setStatus('cancelled');
      this.pc?.close();
      this.requestSnapshot();

    } else if (msg.type === 'snapshot') {
      this.snapshotImage = msg.payload;
      this.setStatus('snapshot');
    }
  }

  // Single method to update status + emit to parent
  private setStatus(status: 'idle' | 'waiting' | 'streaming' | 'cancelled' | 'snapshot'): void {
    this.status = status;
    this.statusChange.emit(status);
  }

  private requestSnapshot(): void {
    this.checkService.send({
      type: 'snapshot-request',
      from: this.caregiverId,
      to: this.patientId
    });
  }

  stopCheck(): void {
    this.pc?.close();
    this.setStatus('idle');
    if (this.remoteVideoRef?.nativeElement) {
      this.remoteVideoRef.nativeElement.srcObject = null;
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.pc?.close();
    this.checkService.disconnect();
  }
}