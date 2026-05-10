// voice-sos.service.ts — continuous mode for reliable single-word trigger
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

let _globalInstanceActive = false;

@Injectable({ providedIn: 'root' })
export class VoiceSosService implements OnDestroy {
  sosTrigger$ = new Subject<void>();

  private recognition: any = null;
  private isListening = false;
  private restartTimeout: any = null;
  private destroyed = false;
  private ownsGlobalLock = false;
  private networkErrorCount = 0;
  private triggered = false; // prevent double-firing
  private screamStream: MediaStream | null = null;
  private screamAudioCtx: AudioContext | null = null;
  private screamAnalyser: AnalyserNode | null = null;
  private screamRafId: number | null = null;
  private loudSince = 0;

  private readonly TRIGGER_WORDS = [
    'help', 'sos', 'emergency', 'urgent', 'au secours', 'aidez moi'
  ];

  constructor(private ngZone: NgZone) {}

  start(): void {
    if (_globalInstanceActive) {
      console.log('[VoiceSOS] Already active — skipping');
      return;
    }
    if (this.isListening || this.destroyed) return;

    _globalInstanceActive = true;
    this.ownsGlobalLock = true;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[VoiceSOS] SpeechRecognition not supported; loud distress monitor will still run');
      this.isListening = true;
      this.startScreamMonitor();
      return;
    }

    console.log('[VoiceSOS] Starting recognition');
    this.initRecognition(SpeechRecognition);
    this.startScreamMonitor();
  }

  private initRecognition(SpeechRecognition: any): void {
    if (this.destroyed || !this.ownsGlobalLock) return;

    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }

    const rec = new SpeechRecognition();

    // ── continuous + interimResults: keeps one long session open ──────────
    // Fewer reconnections = fewer network errors = faster trigger detection.
    // interimResults=true fires as you speak, not just when you pause,
    // so "help" triggers immediately rather than after a silence timeout.
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    this.ngZone.runOutsideAngular(() => {

      rec.onstart = () => {
        console.log('[VoiceSOS] 🎤 onstart — mic open');
        this.triggered = false; // reset on each new session
      };

      rec.onaudiostart = () => {
        console.log('[VoiceSOS] 🔊 onaudiostart — audio captured ✅');
      };

      rec.onsoundstart = () => {
        console.log('[VoiceSOS] 📢 onsoundstart — sound detected');
      };

      rec.onspeechstart = () => {
        console.log('[VoiceSOS] 🗣️ onspeechstart — speech detected');
      };

      rec.onspeechend = () => {
        console.log('[VoiceSOS] 🔇 onspeechend');
      };

      rec.onresult = (event: any) => {
        this.networkErrorCount = 0; // reset on successful result

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          console.log('[VoiceSOS] 📝 Heard:', transcript,
            event.results[i].isFinal ? '(final)' : '(interim)');

          // Check both interim and final — trigger as soon as word is heard
          const triggered = this.TRIGGER_WORDS.some(w => transcript.includes(w));

          if (triggered && !this.triggered) {
            this.triggered = true; // prevent firing multiple times per utterance
            console.log('[VoiceSOS] 🚨 TRIGGER DETECTED:', transcript);
            this.ngZone.run(() => this.sosTrigger$.next());

            // Reset trigger flag after 5s so it can fire again if needed
            setTimeout(() => { this.triggered = false; }, 5000);
          }
        }
      };

      rec.onnomatch = () => {
        console.log('[VoiceSOS] ⚠️ onnomatch');
      };

      rec.onerror = (event: any) => {
        console.warn('[VoiceSOS] ❌ onerror:', event.error);

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.error('[VoiceSOS] Permission denied — stopping permanently');
          this.isListening = false;
          _globalInstanceActive = false;
          this.ownsGlobalLock = false;
          return;
        }

        if (event.error === 'network') {
          this.networkErrorCount++;
          console.warn(`[VoiceSOS] Network error #${this.networkErrorCount} — ` +
            `browser cannot reach Google speech servers. Will retry.`);
        }
        // All other errors (no-speech, aborted, network) → onend restarts
      };

      rec.onend = () => {
        console.log('[VoiceSOS] onend — scheduling restart');
        if (this.isListening && !this.destroyed && this.ownsGlobalLock) {
          // Longer delay for network errors to avoid hammering Google's servers
          const delay = this.networkErrorCount > 0 ? 3000 : 500;
          this.restartTimeout = setTimeout(() => {
            if (this.isListening && !this.destroyed && this.ownsGlobalLock) {
              try {
                rec.start();
                console.log('[VoiceSOS] 🔄 Restarted');
              } catch (e: any) {
                if (e?.name === 'InvalidStateError') {
                  console.warn('[VoiceSOS] InvalidStateError — reinitializing');
                  this.recognition = null;
                  this.initRecognition(SpeechRecognition);
                } else {
                  console.warn('[VoiceSOS] Restart error:', e);
                }
              }
            }
          }, delay);
        }
      };

      try {
        rec.start();
        this.isListening = true;
        console.log('[VoiceSOS] 🟢 Recognition started (continuous mode)');
      } catch (e) {
        console.error('[VoiceSOS] Failed to start:', e);
        _globalInstanceActive = false;
        this.ownsGlobalLock = false;
      }

    }); // end runOutsideAngular

    this.recognition = rec;
  }

  private async startScreamMonitor(): Promise<void> {
    this.ngZone.runOutsideAngular(async () => {
      try {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextCtor || !navigator.mediaDevices?.getUserMedia) return;

        this.screamStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.screamAudioCtx = new AudioContextCtor();
        const source = this.screamAudioCtx.createMediaStreamSource(this.screamStream);
        this.screamAnalyser = this.screamAudioCtx.createAnalyser();
        this.screamAnalyser.fftSize = 1024;
        source.connect(this.screamAnalyser);
        this.monitorScreamVolume();
      } catch (error) {
        console.warn('[VoiceSOS] Loud sound monitor unavailable:', error);
      }
    });
  }

  private monitorScreamVolume(): void {
    if (!this.screamAnalyser || this.destroyed || !this.ownsGlobalLock) return;

    const data = new Uint8Array(this.screamAnalyser.fftSize);
    const tick = () => {
      if (!this.screamAnalyser || this.destroyed || !this.ownsGlobalLock) return;

      this.screamAnalyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) {
        const normalized = (value - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = Date.now();

      if (rms > 0.36) {
        this.loudSince ||= now;
        if (now - this.loudSince > 500 && !this.triggered) {
          this.triggered = true;
          console.log('[VoiceSOS] Loud distress sound detected');
          this.ngZone.run(() => this.sosTrigger$.next());
          setTimeout(() => { this.triggered = false; }, 6000);
          this.loudSince = 0;
        }
      } else {
        this.loudSince = 0;
      }

      this.screamRafId = requestAnimationFrame(tick);
    };

    this.screamRafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.isListening = false;
    this.triggered = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
    if (this.screamRafId !== null) {
      cancelAnimationFrame(this.screamRafId);
      this.screamRafId = null;
    }
    this.screamStream?.getTracks().forEach(track => track.stop());
    this.screamStream = null;
    this.screamAudioCtx?.close();
    this.screamAudioCtx = null;
    this.screamAnalyser = null;
    this.loudSince = 0;
    if (this.ownsGlobalLock) {
      _globalInstanceActive = false;
      this.ownsGlobalLock = false;
    }
    console.log('[VoiceSOS] 🔴 Listener stopped');
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stop();
  }
}
