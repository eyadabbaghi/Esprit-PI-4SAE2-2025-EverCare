import {
  Component, OnInit, OnDestroy, Input,
  ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { Router } from '@angular/router';

declare const JitsiMeetExternalAPI: any;

@Component({
  selector: 'app-jitsi-meet',
  templateUrl: './jitsi-meet.component.html',
  styleUrls: ['./jitsi-meet.component.css']
})
export class JitsiMeetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() roomName!: string;
  @Input() userName!: string;
  @Input() userEmail?: string;
  @Input() isDoctor: boolean = false;

  @ViewChild('jitsiContainer') jitsiContainer!: ElementRef;

  private api: any;
  isLoading = true;
  error: string | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Safety fallback — hide loader after 8 seconds no matter what
    setTimeout(() => {
      this.isLoading = false;
    }, 8000);

    this.loadJitsiScript().then(() => {
      setTimeout(() => {
        this.initJitsi();
      }, 500);
    }).catch(() => {
      this.error = 'Failed to load video conference.';
      this.isLoading = false;
    });
  }

  private loadJitsiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof JitsiMeetExternalAPI !== 'undefined') {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private initJitsi(): void {
    const domain = 'meet.jit.si';
    const options = {
      roomName: this.roomName,
      width: '100%',
      height: '100%',
      parentNode: this.jitsiContainer.nativeElement,
      userInfo: {
        displayName: this.userName,
        email: this.userEmail || ''
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        toolbarButtons: [
          'microphone', 'camera', 'hangup',
          'chat', 'fullscreen', 'settings', 'raisehand'
        ]
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_ALWAYS_VISIBLE: true,
        DEFAULT_BACKGROUND: '#1a1a2e',
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        APP_NAME: 'EverCare Consultation'
      }
    };

    try {
      this.api = new JitsiMeetExternalAPI(domain, options);

      this.api.addEventListener('videoConferenceJoined', () => {
        this.isLoading = false;
      });

      this.api.addEventListener('readyToClose', () => {
        this.leaveCall();
      });

      this.api.addEventListener('participantLeft', (event: any) => {
        console.log('Participant left:', event);
      });

    } catch (e) {
      this.error = 'Could not initialize video conference.';
      this.isLoading = false;
    }
  }

  leaveCall(): void {
    if (this.api) {
      this.api.dispose();
    }
    if (this.isDoctor) {
      this.router.navigate(['/appointments/doctor']);
    } else {
      this.router.navigate(['/appointments']);
    }
  }

  ngOnDestroy(): void {
    if (this.api) {
      this.api.dispose();
    }
  }
}
