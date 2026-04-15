import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges
} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

type JournalApiEntry = {
  id: number;
  patientId: string;
  text?: string | null;
  audioPath?: string | null;
  createdAt: string;
};

@Component({
  selector: 'app-journal',
  templateUrl: './journal.component.html',
  styleUrls: ['./journal.component.css']
})
export class JournalComponent implements OnInit, OnDestroy, OnChanges {

  @Input() patientIdInput: string | null = null;
  @Input() readOnly = false;

  journalText = '';
  entries: JournalApiEntry[] = [];

  loading = false;
  uploading = false;
  errorMsg = '';

  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private lastRecordedBlob: Blob | null = null;

  isRecording = false;
  hasRecordedAudio = false;
  recordedPreviewUrl: string | null = null;

  recordingSeconds = 0;
  private timer: any = null;

 private readonly API_BASE = 'http://localhost:8098/dailyme/api/journal';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // ✅ don't show "No patient selected" on init
    // wait until patientIdInput is ready (or localStorage fallback works)
    this.tryLoad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // ✅ when doctor selects a patient, or when user loads async
    if (changes['patientIdInput']) {
      this.tryLoad(true);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.cleanupStream();
    this.resetAudioPreview();
  }

  private tryLoad(resetUi: boolean = false): void {
    const pid = this.getPatientId();

    if (!pid) {
      // Don't spam error in patient mode if id not ready yet
      this.entries = [];
      return;
    }

    if (resetUi) {
      this.journalText = '';
      this.resetAudioPreview();
      this.hasRecordedAudio = false;
      this.lastRecordedBlob = null;
    }

    this.loadEntries(pid);
  }

  private getPatientId(): string {
    // 1) explicit input from parent (BEST)
    if (this.patientIdInput && String(this.patientIdInput).trim()) {
      return String(this.patientIdInput).trim();
    }

    // 2) fallback localStorage (if you still use it)
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const id = u.userId || u.id || u.patientId || (u.user && (u.user.userId || u.user.id));
        if (id != null) return String(id);
      } catch {}
    }

    // 3) other possible keys
    const p1 = localStorage.getItem('patientId');
    const p2 = localStorage.getItem('userId');
    return (p1 || p2 || '').trim();
  }

  refresh(): void {
    const pid = this.getPatientId();
    if (!pid) {
      this.errorMsg = 'No patient selected.';
      return;
    }
    this.loadEntries(pid);
  }

  private loadEntries(patientId: string): void {
    this.loading = true;
    this.errorMsg = '';

    this.http
      .get<JournalApiEntry[]>(
        `${this.API_BASE}/patient/${encodeURIComponent(patientId)}`
      )
      .subscribe({
        next: (res) => {
          this.entries = Array.isArray(res) ? res : [];
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.errorMsg = this.humanHttpError(err, 'Failed to load journal entries.');
        }
      });
  }

  saveTextOnly(): void {
    if (this.readOnly) return;

    const pid = this.getPatientId();
    const text = this.journalText.trim();

    if (!pid) {
      this.errorMsg = 'No patient selected.';
      return;
    }
    if (!text) return;

    this.uploading = true;
    this.errorMsg = '';

    const form = new FormData();
    form.append('patientId', pid);
    form.append('text', text);

    this.http.post<JournalApiEntry>(`${this.API_BASE}/upload`, form).subscribe({
      next: () => {
        this.journalText = '';
        this.uploading = false;
        this.loadEntries(pid);
      },
      error: (err: HttpErrorResponse) => {
        this.uploading = false;
        this.errorMsg = this.humanHttpError(err, 'Failed to save text entry.');
      }
    });
  }

  async startRecording(): Promise<void> {
    if (this.readOnly) return;

    this.errorMsg = '';
    if (this.isRecording) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMsg = 'Microphone is not supported in this browser.';
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType =
        (window as any).MediaRecorder?.isTypeSupported?.('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : (window as any).MediaRecorder?.isTypeSupported?.('audio/webm')
          ? 'audio/webm'
          : '';

      this.chunks = [];
      this.lastRecordedBlob = null;
      this.hasRecordedAudio = false;
      this.resetAudioPreview();

      this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);

      this.recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };

      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' });
        this.lastRecordedBlob = blob;
        this.hasRecordedAudio = blob.size > 0;

        if (this.hasRecordedAudio) {
          this.recordedPreviewUrl = URL.createObjectURL(blob);
        }

        this.isRecording = false;
        this.stopTimer();
        this.cleanupStream();
      };

      this.recorder.start();
      this.isRecording = true;

      this.recordingSeconds = 0;
      this.startTimer();

    } catch {
      this.errorMsg = 'Microphone permission denied or unavailable.';
      this.cleanupStream();
    }
  }

  stopRecording(): void {
    if (this.readOnly) return;
    if (!this.recorder) return;
    if (this.recorder.state !== 'inactive') this.recorder.stop();
  }

  saveRecordedAudio(): void {
    if (this.readOnly) return;

    const pid = this.getPatientId();
    if (!pid) {
      this.errorMsg = 'No patient selected.';
      return;
    }
    if (!this.lastRecordedBlob || !this.hasRecordedAudio) {
      this.errorMsg = 'No recorded audio to save.';
      return;
    }

    this.uploading = true;
    this.errorMsg = '';

    const form = new FormData();
    form.append('patientId', pid);

    const text = this.journalText.trim();
    if (text) form.append('text', text);

    const type = this.lastRecordedBlob.type || 'audio/webm';
    const file = new File([this.lastRecordedBlob], `journal_${Date.now()}.webm`, { type });

    form.append('audio', file);

    this.http.post<JournalApiEntry>(`${this.API_BASE}/upload`, form).subscribe({
      next: () => {
        this.uploading = false;
        this.journalText = '';
        this.hasRecordedAudio = false;
        this.lastRecordedBlob = null;
        this.resetAudioPreview();
        this.loadEntries(pid);
      },
      error: (err: HttpErrorResponse) => {
        this.uploading = false;
        this.errorMsg = this.humanHttpError(err, 'Failed to upload voice entry.');
      }
    });
  }

  deleteEntry(id: number): void {
    if (this.readOnly) return;

    const pid = this.getPatientId();
    if (!pid) return;

    this.http.delete<void>(`${this.API_BASE}/${id}`).subscribe({
      next: () => this.loadEntries(pid),
      error: (err: HttpErrorResponse) => {
        this.errorMsg = this.humanHttpError(err, 'Failed to delete entry.');
      }
    });
  }

  audioUrl(e: JournalApiEntry): string | null {
    if (!e.audioPath) return null;

    const p = e.audioPath.replace(/\\/g, '/');
    if (p.startsWith('http://') || p.startsWith('https://')) return p;

    // ✅ same service port/context
    return `http://localhost:8098/dailyme/${p}`;
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.recordingSeconds++;
      if (this.recordingSeconds >= 120) this.stopRecording();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private cleanupStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      this.stream = null;
    }
    this.recorder = null;
    this.chunks = [];
  }

  private resetAudioPreview(): void {
    if (this.recordedPreviewUrl) {
      URL.revokeObjectURL(this.recordedPreviewUrl);
      this.recordedPreviewUrl = null;
    }
  }

  formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  private humanHttpError(err: HttpErrorResponse, fallback: string): string {
    if (!err) return fallback;
    if (err.status === 0) return 'Backend unreachable (CORS or server down).';
    if (typeof err.error === 'string' && err.error.trim()) return err.error;
    if ((err.error as any)?.message) return String((err.error as any).message);
    return `${fallback} (HTTP ${err.status})`;
  }
}