import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { Observable, Subscription, of } from 'rxjs';
import { DailyMeService } from '../services/daily-me.service';
import { DailyEntry } from '../models/daily-entry.model';
import { AuthService } from '../../front-office/pages/login/auth.service';
import { HttpClient } from '@angular/common/http';
import * as faceapi from 'face-api.js';

// ✅ ng2-charts / chart.js
import { ChartConfiguration, ChartData } from 'chart.js';

type SimplePatient = { userId: string; name: string; email: string };
type MoodKey = 'Happy' | 'Neutral' | 'Sad' | 'Anxious' | 'Angry' | 'Tired' | 'Excited' | 'Calm';

interface MoodUI {
  key: MoodKey;
  label: string;
  emoji: string;
  badgeText: string;
  message: string;
  bgClass: string;
}

interface WeeklyDistItem {
  key: MoodKey;
  label: string;
  emoji: string;
  count: number;
}

@Component({
  selector: 'app-daily-me-list',
  templateUrl: './daily-me-list.component.html',
  styleUrls: ['./daily-me-list.component.css']
})
export class DailyMeListComponent implements OnInit, OnDestroy {

  // ================= FACE EMOTION =================
  @ViewChild('emotionVideo') emotionVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('emotionOverlay') emotionOverlayRef!: ElementRef<HTMLCanvasElement>;

  emotionRunning = false;
  detectedLabel: string | null = null;
  detectedConfidence: number | null = null;
  detectedMoodKey: MoodKey | null = null;

  private emotionStream: MediaStream | null = null;
  private rafId: number | null = null;
  private lastTs = 0;
  private modelsLoaded = false;

  private ema: Record<string, number> = {
    neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0
  };
  private alpha = 0.35;
  // =================================================

  user: any = null;
  entries$: Observable<DailyEntry[]> = of([]);

  isEditing = false;
  private sub = new Subscription();

  private myUserId: string = '';
  selectedPatientId: string = '';
  patients: SimplePatient[] = [];

  activeTab: 'mood' | 'tasks' | 'journal' = 'mood';

  selectedMood: MoodUI | null = null;
  showMoodToast = false;

  // ✅ Welcome popup
  showWelcomePopup = false;
  welcomeName = '';
  private todayKey = '';
  private checkedTodayOnce = false;

  // ✅ Custom Delete Modal
  showDeleteModal: boolean = false;
  private deleteId: number | null = null;

  // ✅ App UI modal (replaces alert())
  uiModal = {
    open: false,
    title: 'Notice',
    message: ''
  };

  moods: MoodUI[] = [
    { key: 'Happy', label: 'Happy', emoji: '😊', badgeText: 'Feeling Happy', message: "I'm so glad you're feeling happy today! 💖", bgClass: 'bg-[#DCFCE7]' },
    { key: 'Excited', label: 'Excited', emoji: '🤩', badgeText: 'Feeling Excited', message: "Love that energy! Use it for one small win today. ✨", bgClass: 'bg-[#DCFCE7]' },
    { key: 'Calm', label: 'Calm', emoji: '😌', badgeText: 'Feeling Calm', message: "That calm feeling is precious. Keep it going. 🍃", bgClass: 'bg-[#DBEAFE]' },
    { key: 'Neutral', label: 'Okay', emoji: '😐', badgeText: 'Feeling Okay', message: "It's okay to feel neutral. Small steps still count. 🌿", bgClass: 'bg-[#F3E8FF]' },
    { key: 'Anxious', label: 'Anxious', emoji: '😰', badgeText: 'Feeling Anxious', message: "Take deep breaths — you're stronger than you know. 🫶", bgClass: 'bg-[#FEF3C7]' },
    { key: 'Sad', label: 'Sad', emoji: '😔', badgeText: 'Feeling Sad', message: "Be gentle with yourself today. 🤍", bgClass: 'bg-[#FEE2E2]' },
    { key: 'Angry', label: 'Angry', emoji: '😠', badgeText: 'Feeling Angry', message: "Anger is valid. Pause + slow breathing. 🧘", bgClass: 'bg-[#FFE4E6]' },
    { key: 'Tired', label: 'Tired', emoji: '🥱', badgeText: 'Feeling Tired', message: "Rest is productive. Even a small break helps. 💤", bgClass: 'bg-[#E0E7FF]' }
  ];

  currentEntry: DailyEntry = {
    patientId: '',
    entryDate: new Date().toISOString().split('T')[0],
    dailyEmotion: '',
    notes: ''
  };

  // ✅ HISTORY SEARCH/FILTER
  searchText: string = '';
  selectedMoodFilter: string = '';
  selectedDateFilter: string = '';
  entriesList: DailyEntry[] = [];
  filteredEntries: DailyEntry[] = [];
  private entriesSub: Subscription | null = null;

  // ================= WEEKLY ANALYSIS (PATIENT + DOCTOR) =================
  weeklyTrendText: string = '—';
  weeklyTrendHint: string = 'Save some moods to see a trend.';
  weeklyAverage: number = 0;
  weeklyMostCommonEmoji: string = '🙂';
  weeklyMostCommonLabel: string = '—';
  weeklyDistribution: WeeklyDistItem[] = [];

  chartData: ChartData<'bar'> | null = null;
  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } }
    }
  };
  // =====================================================================

  constructor(
    private dailyService: DailyMeService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.authService.currentUser$.subscribe((u: any) => {
        this.user = u;
        this.myUserId = u?.userId || '';

        const role = (u?.role || '').toLowerCase();

        if (role === 'patient') {
          this.entries$ = this.dailyService.entries$;

          this.welcomeName =
            u?.name ||
            u?.fullName ||
            u?.username ||
            (u?.email ? String(u.email).split('@')[0] : 'there');

          this.checkedTodayOnce = false;

          if (this.myUserId) {
            this.currentEntry.patientId = this.myUserId;
            this.dailyService.init(this.myUserId);
          }

          this.bindEntriesStream(this.entries$);

          this.sub.add(
            this.entries$.subscribe((list: DailyEntry[]) => {
              this.tryOpenWelcomePopup(list || []);
            })
          );

          return;
        }

        // DOCTOR/CAREGIVER
        this.dailyService.destroy();
        this.entries$ = of([]);
        this.selectedPatientId = '';

        this.entriesList = [];
        this.filteredEntries = [];
        this.resetFilters();
        this.resetWeeklyAnalysis();

        this.loadPatients();
      })
    );
  }

  ngOnDestroy(): void {
    this.stopEmotionDetection();
    this.sub.unsubscribe();
    this.dailyService.destroy();
    if (this.entriesSub) {
      this.entriesSub.unsubscribe();
      this.entriesSub = null;
    }
  }

  setTab(tab: 'mood' | 'tasks' | 'journal'): void {
    this.activeTab = tab;
    if (tab !== 'mood') this.stopEmotionDetection();
  }

  // ✅ UI MODAL helpers
  openUIModal(message: string, title: string = 'Notice'): void {
    this.uiModal.title = title;
    this.uiModal.message = message;
    this.uiModal.open = true;
  }

  closeUIModal(): void {
    this.uiModal.open = false;
  }

  // ✅ Helpers (avoid 12:00 AM when only date exists)
  hasTime(entry: DailyEntry): boolean {
    return !!entry.entryDateTime;
  }

  // ================= FACE EMOTION =================
  async startEmotionDetection(): Promise<void> {
    if (this.emotionRunning) return;

    const role = (this.user?.role || '').toLowerCase();
    if (role !== 'patient') return;

    this.emotionRunning = true;

    try {
      await this.loadFaceModelsOnce();
      await this.startCamera();

      const video = this.emotionVideoRef.nativeElement;
      const canvas = this.emotionOverlayRef.nativeElement;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      this.loop();
    } catch (e) {
      console.error('Emotion start failed', e);
      this.openUIModal('Camera / models failed. Check permissions and /assets/models.', 'Camera error');
      this.stopEmotionDetection();
    }
  }

  stopEmotionDetection(): void {
    this.emotionRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.emotionStream) {
      const tracks = this.emotionStream.getTracks();
      for (let i = 0; i < tracks.length; i++) tracks[i].stop();
      this.emotionStream = null;
    }

    this.detectedLabel = null;
    this.detectedConfidence = null;
    this.detectedMoodKey = null;

    Object.keys(this.ema).forEach(k => (this.ema[k] = 0));

    const canvas = this.emotionOverlayRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  useDetectedMood(): void {
    if (!this.detectedMoodKey) return;
    this.selectMood(this.detectedMoodKey);
  }

  private async loadFaceModelsOnce(): Promise<void> {
    if (this.modelsLoaded) return;

    const url = '/assets/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(url);
    await faceapi.nets.faceExpressionNet.loadFromUri(url);

    this.modelsLoaded = true;
  }

  private async startCamera(): Promise<void> {
    const video = this.emotionVideoRef.nativeElement;

    const constraints: MediaStreamConstraints = {
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    };

    this.emotionStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = this.emotionStream;
    await video.play();
  }

  private loop(): void {
    if (!this.emotionRunning) return;

    this.rafId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    const processEveryMs = 120;
    if (now - this.lastTs < processEveryMs) return;
    this.lastTs = now;

    this.processFrame().catch(() => {});
  }

  private async processFrame(): Promise<void> {
    const video = this.emotionVideoRef.nativeElement;
    const canvas = this.emotionOverlayRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.videoWidth && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const det = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
      .withFaceExpressions();

    if (!det) {
      this.detectedLabel = null;
      this.detectedConfidence = null;
      this.detectedMoodKey = null;
      return;
    }

    const resized = faceapi.resizeResults(det, { width: canvas.width, height: canvas.height });
    faceapi.draw.drawDetections(canvas, resized as any);

    const expr = det.expressions as any;
    const keys = ['neutral','happy','sad','angry','fearful','disgusted','surprised'];

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = Number(expr[k] ?? 0);
      this.ema[k] = this.alpha * v + (1 - this.alpha) * this.ema[k];
    }

    let bestKey = 'neutral';
    let bestVal = -1;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (this.ema[k] > bestVal) {
        bestVal = this.ema[k];
        bestKey = k;
      }
    }

    this.detectedConfidence = bestVal;
    this.detectedLabel = bestKey;
    this.detectedMoodKey = this.mapFaceToMoodKey(bestKey);
  }

  private mapFaceToMoodKey(faceKey: string): MoodKey {
    const k = (faceKey || '').toLowerCase();
    if (k === 'happy') return 'Happy';
    if (k === 'sad') return 'Sad';
    if (k === 'angry') return 'Angry';
    if (k === 'fearful' || k === 'surprised') return 'Anxious';
    return 'Neutral';
  }

  // ✅ WELCOME POPUP
  private todayYYYYMMDD(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private buildWelcomeKey(userId: string): string {
    return `dailyme_welcome_${userId}_${this.todayYYYYMMDD()}`;
  }

  private hasMoodToday(list: DailyEntry[]): boolean {
    const today = this.todayYYYYMMDD();
    return (list || []).some(e => (e.entryDate || '') === today);
  }

  private tryOpenWelcomePopup(entries: DailyEntry[]): void {
    if (this.checkedTodayOnce) return;
    const role = (this.user?.role || '').toLowerCase();
    if (role !== 'patient') return;
    if (!this.myUserId) return;

    this.todayKey = this.buildWelcomeKey(this.myUserId);

    if (localStorage.getItem(this.todayKey)) {
      this.checkedTodayOnce = true;
      return;
    }

    if (!this.hasMoodToday(entries)) {
      this.showWelcomePopup = true;
    }

    this.checkedTodayOnce = true;
  }

  dismissWelcomePopup(): void {
    if (this.todayKey) localStorage.setItem(this.todayKey, '1');
    this.showWelcomePopup = false;
  }

  goToMoodCheckIn(): void {
    this.dismissWelcomePopup();
    this.setTab('mood');
    setTimeout(() => {
      const el = document.getElementById('mood-checkin');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  // ✅ MOOD
  selectMood(mood: MoodKey): void {
    this.currentEntry.dailyEmotion = mood;
    this.selectedMood = this.moods.find(m => m.key === mood) || null;

    this.showMoodToast = true;
    window.setTimeout(() => (this.showMoodToast = false), 2000);
  }

  saveEntry(): void {
    const role = (this.user?.role || '').toLowerCase();
    if (role !== 'patient') {
      this.openUIModal('Only patients can add mood entries.', 'Access denied');
      return;
    }
    if (!this.currentEntry.dailyEmotion) {
      this.openUIModal('Please select a mood first!', 'Missing mood');
      return;
    }
    if (!this.myUserId) {
      this.openUIModal('User not loaded. Please re-login.', 'Session error');
      return;
    }

    this.currentEntry.patientId = this.myUserId;

    // ✅ exact timestamp (backend must store entryDateTime if you want true time later)
    const payload: DailyEntry = {
      ...this.currentEntry,
      entryDate: new Date().toISOString().split('T')[0],
      entryDateTime: new Date().toISOString()
    };

    if (this.isEditing) {
      this.dailyService.updateEntry(payload).subscribe({
        next: () => this.resetForm(),
        error: (err: any) => {
          console.error('Update failed', err);
          this.openUIModal('Update failed, please try again.', 'Error');
        }
      });
    } else {
      this.dailyService.addEntry(payload).subscribe({
        next: () => this.resetForm(),
        error: (err: any) => {
          console.error('Save failed', err);
          this.openUIModal('Save failed, please try again.', 'Error');
        }
      });
    }
  }

  resetForm(): void {
    this.isEditing = false;
    this.currentEntry = {
      patientId: this.myUserId,
      entryDate: new Date().toISOString().split('T')[0],
      dailyEmotion: '',
      notes: ''
    };
    this.selectedMood = null;
  }

  editEntry(entry: DailyEntry): void {
    this.currentEntry = { ...entry };
    this.isEditing = true;
    this.selectedMood = this.moods.find(m => m.key === (entry.dailyEmotion as MoodKey)) || null;
  }

  trackByEntryId(index: number, e: DailyEntry): number {
    return Number(e.id || index);
  }

  // ✅ DELETE MODAL
  openDeleteModal(id: number): void {
    const role = (this.user?.role || '').toLowerCase();
    if (role !== 'patient' || !this.myUserId) return;
    this.deleteId = id;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.deleteId = null;
  }

  confirmDelete(): void {
    const role = (this.user?.role || '').toLowerCase();
    if (role !== 'patient' || !this.myUserId) return;
    if (this.deleteId === null) return;

    this.dailyService.deleteEntry(this.deleteId, this.myUserId).subscribe({
      next: () => this.cancelDelete(),
      error: (err: any) => {
        console.error('Delete failed', err);
        this.cancelDelete();
        this.openUIModal('Delete failed, please try again.', 'Error');
      }
    });
  }

  // ✅ Patients for doctor
  loadPatients(): void {
    const url = 'http://localhost:8096/EverCare/users/patients';

    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('jwt') ||
      '';

    const headers: any = token ? { Authorization: `Bearer ${token}` } : {};

    this.http.get<any>(url, { headers }).subscribe({
      next: (res: any) => {
        const list: any[] =
          Array.isArray(res) ? res :
          Array.isArray(res?.data) ? res.data :
          Array.isArray(res?.patients) ? res.patients :
          [];

        this.patients = list.map((p: any) => {
          const id = String(p.userId || p.id || p.patientId || p._id || '');
          const name =
            (p.name && String(p.name).trim()) ||
            `${p.firstName || ''} ${p.lastName || ''}`.trim() ||
            (p.username ? String(p.username) : '') ||
            (p.email ? String(p.email).split('@')[0] : 'Patient');

          const email = String(p.email || '');
          return { userId: id, name, email };
        }).filter((p: any) => p.userId !== '');
      },
      error: (err: any) => {
        console.error('FAILED loading patients:', err.status, err.error);
        this.patients = [];
      }
    });
  }

  onSelectPatient(): void {
    const id = String(this.selectedPatientId || '').trim();

    if (!id) {
      this.entries$ = of([]);
      this.entriesList = [];
      this.filteredEntries = [];
      this.resetFilters();
      this.resetWeeklyAnalysis();
      if (this.entriesSub) { this.entriesSub.unsubscribe(); this.entriesSub = null; }
      return;
    }

    this.entries$ = this.dailyService.getEntriesByPatient(id);
    this.bindEntriesStream(this.entries$);
  }

  getEmotionIcon(emotion: string): string {
    const found = this.moods.find(m => m.key === (emotion as MoodKey));
    return found ? found.emoji : '🙂';
  }

  // ✅ Filters
  applyFilters(): void {
    const text = (this.searchText || '').trim().toLowerCase();
    const mood = (this.selectedMoodFilter || '').trim();
    const date = (this.selectedDateFilter || '').trim();

    this.filteredEntries = (this.entriesList || []).filter((entry: DailyEntry) => {
      const notes = (entry.notes || '').toLowerCase();
      const emotion = (entry.dailyEmotion || '').toLowerCase();

      const matchesText = !text || notes.includes(text) || emotion.includes(text);
      const matchesMood = !mood || (entry.dailyEmotion || '') === mood;

      const eDate = String(entry.entryDate || '');
      const eDT = String(entry.entryDateTime || '');
      const matchesDate = !date || eDate === date || eDT.startsWith(date);

      return matchesText && matchesMood && matchesDate;
    });
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedMoodFilter = '';
    this.selectedDateFilter = '';
    this.filteredEntries = [...(this.entriesList || [])];
  }

  // ✅ BIND + SORT (NEWEST FIRST) + WEEKLY ANALYSIS + FILTERS
  private bindEntriesStream(obs: Observable<DailyEntry[]>): void {
    if (this.entriesSub) {
      this.entriesSub.unsubscribe();
      this.entriesSub = null;
    }

    this.entriesSub = obs.subscribe((list: DailyEntry[]) => {
      const safe = (list || []).slice();

      // ✅ newest first
      safe.sort((a: DailyEntry, b: DailyEntry) => {
        const ta = a.entryDateTime ? new Date(a.entryDateTime).getTime() : new Date(a.entryDate).getTime();
        const tb = b.entryDateTime ? new Date(b.entryDateTime).getTime() : new Date(b.entryDate).getTime();
        return tb - ta;
      });

      this.entriesList = safe;

      // ✅ weekly analysis uses ALL entriesList (not filtered)
      this.computeWeeklyAnalysis(this.entriesList);

      // ✅ apply filters for history display
      this.filteredEntries = [...this.entriesList];
      this.applyFilters();
    });
  }

  // ================= WEEKLY ANALYSIS LOGIC =================

  private resetWeeklyAnalysis(): void {
    this.weeklyTrendText = '—';
    this.weeklyTrendHint = 'Select a patient / save moods to see analysis.';
    this.weeklyAverage = 0;
    this.weeklyMostCommonEmoji = '🙂';
    this.weeklyMostCommonLabel = '—';
    this.weeklyDistribution = [];
    this.chartData = null;
  }

  private getEntryTimeMs(e: DailyEntry): number {
    if (e.entryDateTime) return new Date(e.entryDateTime).getTime();
    return new Date(String(e.entryDate || '') + 'T00:00:00').getTime();
  }

  private moodScore(m: string): number {
    const k = String(m || '') as MoodKey;
    // 1..5 (you can tweak)
    if (k === 'Happy') return 5;
    if (k === 'Excited') return 5;
    if (k === 'Calm') return 4;
    if (k === 'Neutral') return 3;
    if (k === 'Tired') return 2;
    if (k === 'Anxious') return 2;
    if (k === 'Sad') return 1;
    if (k === 'Angry') return 1;
    return 3;
  }

  private moodMeta(key: MoodKey): { label: string; emoji: string } {
    const found = this.moods.find(x => x.key === key);
    return found ? { label: found.label, emoji: found.emoji } : { label: String(key), emoji: '🙂' };
  }

  private computeWeeklyAnalysis(allEntries: DailyEntry[]): void {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6); // last 7 days including today
    start.setHours(0, 0, 0, 0);

    const last7 = (allEntries || [])
      .filter(e => {
        const t = this.getEntryTimeMs(e);
        return t >= start.getTime();
      });

    if (last7.length === 0) {
      this.resetWeeklyAnalysis();
      this.weeklyTrendHint = 'No data yet — save at least one mood entry.';
      return;
    }

    // ---- distribution + most common
    const counts: Record<string, number> = {};
    for (let i = 0; i < last7.length; i++) {
      const k = String(last7[i].dailyEmotion || 'Neutral');
      counts[k] = (counts[k] || 0) + 1;
    }

    let bestKey = 'Neutral';
    let bestCount = -1;
    Object.keys(counts).forEach(k => {
      if (counts[k] > bestCount) {
        bestCount = counts[k];
        bestKey = k;
      }
    });

    const bestMood = bestKey as MoodKey;
    const bestMeta = this.moodMeta(bestMood);
    this.weeklyMostCommonEmoji = bestMeta.emoji;
    this.weeklyMostCommonLabel = bestMeta.label;

    this.weeklyDistribution = Object.keys(counts)
      .map(k => {
        const mk = k as MoodKey;
        const meta = this.moodMeta(mk);
        return { key: mk, label: meta.label, emoji: meta.emoji, count: counts[k] };
      })
      .sort((a, b) => b.count - a.count);

    // ---- average score
    let sum = 0;
    for (let i = 0; i < last7.length; i++) sum += this.moodScore(last7[i].dailyEmotion);
    this.weeklyAverage = Math.round((sum / last7.length) * 10) / 10; // 1 decimal

    // ---- daily bars (7 points)
    const labels: string[] = [];
    const dailyScores: number[] = [];

    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      const dayKey = day.toISOString().slice(0, 10); // YYYY-MM-DD
      labels.push(day.toLocaleDateString(undefined, { weekday: 'short' }));

      const dayEntries = last7.filter(e => {
        const ed = e.entryDateTime ? String(e.entryDateTime).slice(0, 10) : String(e.entryDate || '');
        return ed === dayKey;
      });

      if (dayEntries.length === 0) {
        dailyScores.push(0);
      } else {
        let s = 0;
        for (let i = 0; i < dayEntries.length; i++) s += this.moodScore(dayEntries[i].dailyEmotion);
        dailyScores.push(Math.round((s / dayEntries.length) * 10) / 10);
      }
    }

    this.chartData = {
      labels,
      datasets: [
        { data: dailyScores, label: 'Mood Score' }
      ]
    };

    // ---- trend (compare first 3 days vs last 3 days)
    const firstPart = dailyScores.slice(0, 3);
    const lastPart = dailyScores.slice(4, 7);

    const avg = (arr: number[]) => {
      const valid = arr.filter(x => x > 0);
      if (valid.length === 0) return 0;
      let s = 0;
      for (let i = 0; i < valid.length; i++) s += valid[i];
      return s / valid.length;
    };

    const a1 = avg(firstPart);
    const a2 = avg(lastPart);

    if (a1 === 0 || a2 === 0) {
      this.weeklyTrendText = 'Stable';
      this.weeklyTrendHint = 'Not enough data across the week to compute a strong trend.';
    } else {
      const diff = a2 - a1;
      if (diff > 0.4) {
        this.weeklyTrendText = 'Improving';
        this.weeklyTrendHint = 'Your mood scores are rising compared to earlier this week.';
      } else if (diff < -0.4) {
        this.weeklyTrendText = 'Declining';
        this.weeklyTrendHint = 'Your mood scores are lower compared to earlier this week.';
      } else {
        this.weeklyTrendText = 'Stable';
        this.weeklyTrendHint = 'Your mood scores stayed relatively consistent this week.';
      }
    }
  }

}