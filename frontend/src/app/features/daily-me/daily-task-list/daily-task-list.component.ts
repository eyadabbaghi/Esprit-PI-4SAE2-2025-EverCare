import { Component, Input, OnDestroy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { NgForm } from '@angular/forms'; // ✅ ADDED

import { DailyTask } from '../models/daily-task.model';
import { DailyTaskService } from '../services/daily-task.service';
import { AuthService } from '../../front-office/pages/login/auth.service';

import { DailyMeService } from '../../daily-me/services/daily-me.service';
import { DailyEntry } from '../../daily-me/models/daily-entry.model';

import { DailyMeAlert } from '../../../models/dailyme-alert';
import { PatientDashboardInsightsDTO } from '../models/patient-dashboard-insights';

type TabMode = 'ACTIVE' | 'HISTORY';
type MoodKey = 'Happy' | 'Neutral' | 'Sad' | 'Anxious' | 'Angry' | 'Tired' | 'Excited' | 'Calm';

@Component({
  selector: 'app-daily-task-list',
  templateUrl: './daily-task-list.component.html',
  styleUrls: ['./daily-task-list.component.css']
})
export class DailyTaskListComponent implements OnInit, OnDestroy, OnChanges {

  @Input() patientIdInput: string = '';

  tasks: DailyTask[] = [];
  historyTasks: DailyTask[] = [];

  private sub = new Subscription();
  activeTab: TabMode = 'ACTIVE';

  // CRUD
  isModalOpen = false;
  isEditing = false;
  currentTask: DailyTask = this.emptyTask();

  private patientId: string = '';

  // Role
  isReadOnly = false;
  private roleLower: string = 'patient';

  // filters
  searchTerm = '';
  filterType = 'ALL';
  filterStatus = 'ALL';
  sortMode: 'TIME' | 'TITLE' | 'TYPE' = 'TIME';

  // Alert modal (UI)
  showAlertModal = false;
  alertTitle = '';
  alertText = '';
  alertType: 'warn' | 'error' | 'info' | 'success' = 'info';

  openAlert(title: string, text: string, type: 'warn' | 'error' | 'info' | 'success' = 'info'): void {
    this.alertTitle = title;
    this.alertText = text;
    this.alertType = type;
    this.showAlertModal = true;
  }
  closeAlert(): void {
    this.showAlertModal = false;
  }

  // ---------------- DOCTOR dashboard (charts + risk + notes) ----------------
  typeChartData: ChartConfiguration<'doughnut'>['data'] | null = null;
  typeChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  };

  trendChartData: ChartConfiguration<'line'>['data'] | null = null;
  trendChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } },
    plugins: { legend: { display: false } }
  };

  riskLevelText = '—';
  riskHintText = '';
  riskLevelClass = 'risk-mid';

  trendText = 'Stable';
  trendHint = '';

  aiRecommendations: string[] = [];

  // KPIs in doctor card
  doctorActiveTasks = 0;
  doctorCompletedActive = 0;
  doctorCompletionRate = 0;
  doctorMissedHistory = 0;
  doctorMostCommonType = '—';

  // ✅ DOCTOR Alerts card
  dailyMeAlerts: DailyMeAlert[] = [];
  newAlertsCount = 0;

  // ---------------- PATIENT “métier avancé” (3 cards) ----------------
  patientAdherenceScore = 0;
  patientAdherenceLabel = '—';
  patientAdherenceClass = 'score-mid';
  patientWhy: string[] = [];

  bestTimeSlotText = '—';
  worstTimeSlotText = '—';
  bestTimeHint = '';

  bestTimeChartData: ChartConfiguration<'bar'>['data'] | null = null;
  bestTimeChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } },
    plugins: { legend: { display: false } }
  };

  moodCorrelationRows: { mood: MoodKey; completion: number; days: number }[] = [];
  moodCorrelationHint = 'Add at least 2 mood check-ins to unlock correlations.';

  private moodEntries: DailyEntry[] = [];

  constructor(
    private taskService: DailyTaskService,
    private auth: AuthService,
    private dailyMeService: DailyMeService
  ) {}

  ngOnInit(): void {
    // Doctor mode (patientId from parent)
    if (this.patientIdInput && this.patientIdInput.trim() !== '') {
      this.patientId = this.patientIdInput.trim();
      this.isReadOnly = true;
      this.activeTab = 'ACTIVE';
      this.loadActive();
      this.loadHistory();
      return;
    }

    // Patient mode (logged user)
    this.sub.add(
      this.auth.currentUser$.subscribe((u: any) => {
        this.roleLower = String(u?.role || '').toLowerCase();
        this.isReadOnly = this.roleLower !== 'patient';

        this.patientId = String(u?.userId || '').trim();

        if (!this.patientId) {
          this.tasks = [];
          this.historyTasks = [];
          this.moodEntries = [];
          this.resetDoctorUI();
          this.resetPatientUI();
          this.openAlert('Session issue', 'No Patient ID found. Please login again.', 'warn');
          return;
        }

        this.loadActive();
        this.loadHistory();

        if (!this.isReadOnly) {
          this.loadMoodEntriesForPatient(this.patientId);
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientIdInput']) {
      const newId = String(this.patientIdInput || '').trim();
      if (newId && newId !== this.patientId) {
        this.patientId = newId;
        this.isReadOnly = true;
        this.activeTab = 'ACTIVE';
        this.loadActive();
        this.loadHistory();
      }
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ---------------- Load tasks ----------------
  loadActive(): void {
    if (!this.patientId) return;

    this.sub.add(
      this.taskService.getTasksByPatient(this.patientId).subscribe({
        next: (data) => {
          this.tasks = data || [];

          if (this.isReadOnly) {
            this.loadBackendInsights();
            this.loadAlerts(); // ✅ DOCTOR alerts
          } else {
            this.rebuildPatientInsights();
          }
        },
        error: (err) => {
          console.error('Load ACTIVE tasks failed:', err);
          this.tasks = [];

          if (this.isReadOnly) this.resetDoctorUI();
          else this.rebuildPatientInsights();

          this.openAlert('Load error', 'Failed to load active tasks.', 'error');
        }
      })
    );
  }

  loadHistory(): void {
    if (!this.patientId) return;

    this.sub.add(
      this.taskService.getHistoryByPatient(this.patientId).subscribe({
        next: (data) => {
          this.historyTasks = data || [];

          if (this.isReadOnly) {
            this.loadBackendInsights();
            this.loadAlerts(); // ✅ DOCTOR alerts
          } else {
            this.rebuildPatientInsights();
          }
        },
        error: (err) => {
          console.error('Load HISTORY tasks failed:', err);
          this.historyTasks = [];

          if (this.isReadOnly) this.resetDoctorUI();
          else this.rebuildPatientInsights();

          this.openAlert('Load error', 'Failed to load history tasks.', 'error');
        }
      })
    );
  }

  private loadMoodEntriesForPatient(patientId: string): void {
    this.sub.add(
      this.dailyMeService.getEntriesByPatient(patientId).subscribe({
        next: (list: DailyEntry[]) => {
          this.moodEntries = list || [];
          this.rebuildPatientInsights();
        },
        error: (err: any) => {
          console.warn('Mood entries load failed:', err);
          this.moodEntries = [];
          this.rebuildPatientInsights();
        }
      })
    );
  }

  setTab(tab: TabMode): void {
    this.activeTab = tab;
    if (tab === 'ACTIVE') this.loadActive();
    else this.loadHistory();
  }

  // ---------------- Backend insights (Doctor) ----------------
  private loadBackendInsights(): void {
    if (!this.patientId) return;

    this.sub.add(
      this.taskService.getPatientDashboardInsights(this.patientId).subscribe({
        next: (dto: PatientDashboardInsightsDTO) => {
          this.applyBackendInsights(dto);
        },
        error: (err) => {
          console.error('Insights backend failed:', err);
          this.resetDoctorUI();
          this.openAlert('Insights error', 'Failed to load smart insights from backend.', 'error');
        }
      })
    );
  }

  private applyBackendInsights(dto: PatientDashboardInsightsDTO): void {
    // KPIs
    this.doctorActiveTasks = Number(dto.activeTasks || 0);
    this.doctorCompletedActive = Number(dto.completedActive || 0);
    this.doctorCompletionRate = Math.round(Number(dto.completionRate || 0));
    this.doctorMissedHistory = Number(dto.missedHistory || 0);

    // Most common type
    if (dto.taskTypeDistribution && dto.taskTypeDistribution.length > 0) {
      let best = dto.taskTypeDistribution[0];
      for (let i = 1; i < dto.taskTypeDistribution.length; i++) {
        if ((dto.taskTypeDistribution[i].count || 0) > (best.count || 0)) best = dto.taskTypeDistribution[i];
      }
      this.doctorMostCommonType = best.type || '—';
    } else {
      this.doctorMostCommonType = '—';
    }

    // Doughnut
    if (dto.taskTypeDistribution && dto.taskTypeDistribution.length > 0) {
      this.typeChartData = {
        labels: dto.taskTypeDistribution.map(x => x.type),
        datasets: [{ data: dto.taskTypeDistribution.map(x => x.count) }]
      };
    } else {
      this.typeChartData = null;
    }

    // Trend line
    const trend = dto.weeklyCompletionTrend || [];
    if (trend.length > 0) {
      this.trendChartData = {
        labels: trend.map((x: { day: string; rate: number }) => x.day),
        datasets: [{
          data: trend.map((x: { day: string; rate: number }) => Math.round(x.rate || 0)),
          label: 'Completion %'
        }]
      };
    } else {
      this.trendChartData = null;
    }

    // Risk
    const r = String(dto.riskLevel || '').toUpperCase();
    if (r === 'HIGH') {
      this.riskLevelText = 'HIGH';
      this.riskHintText = 'Low adherence — consider intervention.';
      this.riskLevelClass = 'risk-high';
    } else if (r === 'LOW') {
      this.riskLevelText = 'LOW';
      this.riskHintText = 'Good adherence — reinforce consistency.';
      this.riskLevelClass = 'risk-low';
    } else {
      this.riskLevelText = 'MEDIUM';
      this.riskHintText = 'Moderate adherence — monitor closely.';
      this.riskLevelClass = 'risk-mid';
    }

    // Notes
    this.aiRecommendations = (dto.suggestedNotes || []).slice();

    this.trendText = 'Stable';
    this.trendHint = '';
  }

  // ✅ ALERTS (Doctor)
  loadAlerts(): void {
    if (!this.patientId) return;

    this.sub.add(
      this.taskService.getDailyMeAlertsByPatient(this.patientId).subscribe({
        next: (list) => {
          this.dailyMeAlerts = list || [];
          this.newAlertsCount = this.dailyMeAlerts.filter(a => a.status === 'NEW').length;
        },
        error: () => {
          this.dailyMeAlerts = [];
          this.newAlertsCount = 0;
        }
      })
    );
  }

  resolveAlert(id: number): void {
    this.sub.add(
      this.taskService.resolveDailyMeAlert(id).subscribe({
        next: () => {
          this.loadAlerts();
          this.openAlert('Resolved', 'Alert resolved ✅', 'success');
        },
        error: () => this.openAlert('Error', 'Could not resolve alert.', 'error')
      })
    );
  }

  // getters used by HTML doctor KPI bindings
  get analysisTotalActive(): number { return this.doctorActiveTasks; }
  get analysisCompletedActive(): number { return this.doctorCompletedActive; }
  get analysisCompletionRate(): number { return this.doctorCompletionRate; }
  get analysisMissedCount(): number { return this.doctorMissedHistory; }
  get analysisMostCommonType(): string { return this.doctorMostCommonType; }

  private resetDoctorUI(): void {
    this.doctorActiveTasks = 0;
    this.doctorCompletedActive = 0;
    this.doctorCompletionRate = 0;
    this.doctorMissedHistory = 0;
    this.doctorMostCommonType = '—';

    this.typeChartData = null;
    this.trendChartData = null;

    this.riskLevelText = '—';
    this.riskHintText = '';
    this.riskLevelClass = 'risk-mid';

    this.aiRecommendations = [];

    this.dailyMeAlerts = [];
    this.newAlertsCount = 0;
  }

  // ---------------- Patient KPIs + progress ----------------
  get completedCount(): number {
    let c = 0;
    for (let i = 0; i < this.tasks.length; i++) if (this.tasks[i].completed) c++;
    return c;
  }

  get totalCount(): number { return this.tasks.length; }

  get progressPercent(): number {
    if (this.totalCount === 0) return 0;
    return Math.round((this.completedCount / this.totalCount) * 100);
  }

  // ---------------- Patient “métier avancé” builders ----------------
  private rebuildPatientInsights(): void {
    if (this.isReadOnly) return;
    this.buildPatientAdherenceScore();
    this.buildBestTimeToSucceed();
    this.buildMoodTaskCorrelation();
  }

  private resetPatientUI(): void {
    this.patientAdherenceScore = 0;
    this.patientAdherenceLabel = '—';
    this.patientAdherenceClass = 'score-mid';
    this.patientWhy = [];

    this.bestTimeSlotText = '—';
    this.worstTimeSlotText = '—';
    this.bestTimeHint = '';
    this.bestTimeChartData = null;

    this.moodCorrelationRows = [];
    this.moodCorrelationHint = 'Add at least 2 mood check-ins to unlock correlations.';
  }

  private buildPatientAdherenceScore(): void {
    const activeTotal = this.tasks.length;

    if (activeTotal === 0) {
      this.patientAdherenceScore = 0;
      this.patientAdherenceLabel = '—';
      this.patientAdherenceClass = 'score-mid';
      this.patientWhy = ['No active tasks yet. Add tasks to compute your score.'];
      return;
    }

    const activeDone = this.completedCount;
    const activeRate = activeDone / activeTotal;

    const streak = this.computeMissedStreak(this.historyTasks);
    const criticalPenalty = this.computeCriticalPenalty(this.tasks);
    const timeConsistency = this.computeTimeConsistency(this.tasks);

    let score = 100 * (0.55 * activeRate + 0.20 * timeConsistency + 0.25 * (1 - criticalPenalty));
    score = score - Math.min(15, streak * 5);
    score = Math.max(0, Math.min(100, Math.round(score)));

    this.patientAdherenceScore = score;

    if (score >= 80) {
      this.patientAdherenceLabel = 'Excellent';
      this.patientAdherenceClass = 'score-good';
    } else if (score >= 55) {
      this.patientAdherenceLabel = 'Good';
      this.patientAdherenceClass = 'score-mid';
    } else {
      this.patientAdherenceLabel = 'Needs Support';
      this.patientAdherenceClass = 'score-bad';
    }

    const why: string[] = [];
    why.push(`Active completion: ${Math.round(activeRate * 100)}% (${activeDone}/${activeTotal}).`);
    if (streak >= 2) why.push(`Missed streak detected: ${streak} day(s) in a row.`);
    if (criticalPenalty > 0.25) why.push('Important tasks (Medication/Appointment) are often missed.');
    if (timeConsistency < 0.45) why.push('Your task times are scattered — routine could help.');
    if (why.length < 3) why.push('Keep going — consistency is the key.');

    this.patientWhy = why;
  }

  private computeMissedStreak(history: DailyTask[]): number {
    const last = (history || []).slice(-7).reverse();
    let streak = 0;
    for (let i = 0; i < last.length; i++) {
      if (last[i] && last[i].completed === false) streak++;
      else break;
    }
    return streak;
  }

  private computeCriticalPenalty(list: DailyTask[]): number {
    let criticalTotal = 0;
    let criticalMissed = 0;

    for (let i = 0; i < (list || []).length; i++) {
      const t = list[i];
      const type = String(t.taskType || 'OTHER');
      const isCritical = (type === 'MEDICATION' || type === 'APPOINTMENT');
      if (!isCritical) continue;

      criticalTotal++;
      if (!t.completed) criticalMissed++;
    }

    if (criticalTotal === 0) return 0;
    return criticalMissed / criticalTotal;
  }

  private computeTimeConsistency(list: DailyTask[]): number {
    const buckets: { [key: string]: number } = {};
    let total = 0;

    for (let i = 0; i < (list || []).length; i++) {
      const t = list[i];
      const hh = this.hourOf(t.scheduledTime);
      if (hh < 0) continue;

      const bucket = this.timeBucket(hh);
      buckets[bucket] = (buckets[bucket] || 0) + 1;
      total++;
    }

    if (total === 0) return 0.5;

    const keys = Object.keys(buckets);
    let best = 0;
    for (let i = 0; i < keys.length; i++) best = Math.max(best, buckets[keys[i]]);
    return best / total;
  }

  private buildBestTimeToSucceed(): void {
    const bucketTotal: { [key: string]: number } = {};
    const bucketDone: { [key: string]: number } = {};

    for (let i = 0; i < (this.tasks || []).length; i++) {
      const t = this.tasks[i];
      const hh = this.hourOf(t.scheduledTime);
      if (hh < 0) continue;

      const b = this.timeBucket(hh);
      bucketTotal[b] = (bucketTotal[b] || 0) + 1;
      if (t.completed) bucketDone[b] = (bucketDone[b] || 0) + 1;
    }

    const buckets = Object.keys(bucketTotal);
    if (buckets.length === 0) {
      this.bestTimeSlotText = '—';
      this.worstTimeSlotText = '—';
      this.bestTimeHint = 'No time data yet.';
      this.bestTimeChartData = null;
      return;
    }

    let bestB = buckets[0];
    let bestRate = -1;
    let worstB = buckets[0];
    let worstRate = 999;

    const labels: string[] = [];
    const values: number[] = [];

    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      const tot = bucketTotal[b] || 0;
      const done = bucketDone[b] || 0;

      const alpha = 1;
      const beta = 2;
      const rate = tot ? Math.round(((done + alpha) / (tot + beta)) * 100) : 0;

      labels.push(b);
      values.push(rate);

      if (rate > bestRate) { bestRate = rate; bestB = b; }
      if (rate < worstRate) { worstRate = rate; worstB = b; }
    }

    this.bestTimeSlotText = `${bestB} (${bestRate}%)`;
    this.worstTimeSlotText = `${worstB} (${worstRate}%)`;

    this.bestTimeHint =
      bestRate >= 70
        ? 'Try scheduling important tasks in your best window.'
        : 'Completion is low across windows — start with 1 easy task/day.';

    this.bestTimeChartData = { labels, datasets: [{ data: values, label: 'Completion %' }] };
  }

  private buildMoodTaskCorrelation(): void {
    const allTasks: any[] = [...(this.tasks as any[]), ...(this.historyTasks as any[])];
    const dateKey = this.detectDateKey(allTasks);

    if (!dateKey || !this.moodEntries || this.moodEntries.length < 2) {
      this.moodCorrelationRows = [];
      this.moodCorrelationHint =
        !dateKey
          ? 'No task date field detected (add createdAt/taskDate/scheduledDate).'
          : 'Add at least 2 mood check-ins to unlock correlations.';
      return;
    }

    const moodByDay = new Map<string, MoodKey>();
    for (let i = 0; i < this.moodEntries.length; i++) {
      const e: any = this.moodEntries[i];
      const rawDate = e.entryDate || e.createdAt || e.date;
      const rawMood = e.dailyEmotion || e.mood || e.emotion;

      const day = rawDate ? String(rawDate).slice(0, 10) : '';
      const mood = rawMood ? (String(rawMood) as MoodKey) : null;

      if (day && mood) moodByDay.set(day, mood);
    }

    const totalByMood: { [key: string]: number } = {};
    const doneByMood: { [key: string]: number } = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - 13);

    for (let i = 0; i < allTasks.length; i++) {
      const t: any = allTasks[i];
      const raw = t[dateKey];
      if (!raw) continue;

      const dt = new Date(raw);
      if (isNaN(dt.getTime())) continue;

      dt.setHours(0, 0, 0, 0);
      if (dt < cutoff || dt > today) continue;

      const dayKey = dt.toISOString().slice(0, 10);
      const mood = moodByDay.get(dayKey);
      if (!mood) continue;

      totalByMood[mood] = (totalByMood[mood] || 0) + 1;
      if (t.completed) doneByMood[mood] = (doneByMood[mood] || 0) + 1;
    }

    const moods = Object.keys(totalByMood) as MoodKey[];
    if (moods.length === 0) {
      this.moodCorrelationRows = [];
      this.moodCorrelationHint = 'No overlapping days between tasks and mood check-ins (last 14 days).';
      return;
    }

    const alpha = 1;
    const beta = 2;

    const rows = moods.map((m: MoodKey) => {
      const tot = totalByMood[m] || 0;
      const done = doneByMood[m] || 0;
      const rate = tot ? Math.round(((done + alpha) / (tot + beta)) * 100) : 0;
      return { mood: m, completion: rate, days: tot };
    }).sort((a, b) => b.completion - a.completion);

    this.moodCorrelationRows = rows;

    const minSample = 5;
    const lowSample = rows.some(r => r.days < minSample);

    if (lowSample) {
      this.moodCorrelationHint = `Low data sample — need ≥ ${minSample} tasks per mood for reliable correlation.`;
      return;
    }

    const best = rows[0];
    const worst = rows[rows.length - 1];

    if (best && worst && best.mood !== worst.mood) {
      this.moodCorrelationHint =
        `You perform best on ${best.mood} days (${best.completion}%). Hardest is ${worst.mood} (${worst.completion}%).`;
    } else {
      this.moodCorrelationHint = 'Correlation computed from your last 14 days.';
    }
  }

  private detectDateKey(all: any[]): string {
    const candidates = ['taskDate', 'createdAt', 'date', 'day', 'scheduledDate', 'updatedAt', 'archivedAt'];
    for (let c = 0; c < candidates.length; c++) {
      const key = candidates[c];
      for (let i = 0; i < all.length; i++) if (all[i] && all[i][key]) return key;
    }
    return '';
  }

  // ---------------- displayed list ----------------
  private get currentList(): DailyTask[] {
    return this.activeTab === 'ACTIVE' ? this.tasks : this.historyTasks;
  }

  get displayedTasks(): DailyTask[] {
    let list: DailyTask[] = this.currentList.slice();

    const q = this.normalizeKey(this.searchTerm);
    if (q) {
      list = list.filter((t: DailyTask) => {
        const inTitle = this.normalizeKey(t.title).includes(q);
        const inNotes = this.normalizeKey(t.notes || '').includes(q);
        return inTitle || inNotes;
      });
    }

    if (this.filterType !== 'ALL') list = list.filter((t: DailyTask) => t.taskType === this.filterType);

    if (this.filterStatus === 'DONE') list = list.filter((t: DailyTask) => !!t.completed);
    else if (this.filterStatus === 'TODO') list = list.filter((t: DailyTask) => !t.completed);

    if (this.sortMode === 'TIME') {
      list.sort((a: DailyTask, b: DailyTask) =>
        this.normalizeTime(a.scheduledTime).localeCompare(this.normalizeTime(b.scheduledTime))
      );
    } else if (this.sortMode === 'TITLE') {
      list.sort((a: DailyTask, b: DailyTask) =>
        this.normalizeKey(a.title).localeCompare(this.normalizeKey(b.title))
      );
    } else if (this.sortMode === 'TYPE') {
      list.sort((a: DailyTask, b: DailyTask) => (a.taskType || '').localeCompare(b.taskType || ''));
    }

    return list;
  }

  // ---------------- CRUD ----------------
  openAdd(): void {
    if (this.isReadOnly) return;
    this.isEditing = false;
    this.currentTask = this.emptyTask();
    this.isModalOpen = true;
  }

  openEdit(task: DailyTask): void {
    if (this.isReadOnly) return;
    this.isEditing = true;
    this.currentTask = { ...task };
    this.currentTask.scheduledTime = this.normalizeTime(this.currentTask.scheduledTime);
    this.isModalOpen = true;
  }

  closeModal(): void { this.isModalOpen = false; }

  // ✅ ONLY MODIFIED METHOD (now supports template form validation)
save(form?: NgForm): void {

  if (this.isReadOnly) return;

  // ✅ mark all fields touched when user clicks Save
  if (form) {
    form.form.markAllAsTouched();
  }

  // ✅ then check if form is valid
  if (form && form.invalid) {
    this.openAlert('Invalid form', 'Please fix the highlighted fields before saving.', 'warn');
    return;
  }

    if (!this.patientId) {
      this.openAlert('Session issue', 'No Patient ID found. Please login again.', 'error');
      return;
    }

    const title = (this.currentTask.title || '').trim();
    if (title.length === 0) {
      this.openAlert('Missing title', 'Please enter a task title before saving.', 'warn');
      return;
    }
    if (title.length < 3) {
      this.openAlert('Invalid title', 'Title must be at least 3 characters.', 'warn');
      return;
    }

    // ✅ optional notes control (matches DTO max 500)
    const notes = (this.currentTask.notes || '').trim();
    if (notes.length > 500) {
      this.openAlert('Invalid notes', 'Notes cannot exceed 500 characters.', 'warn');
      return;
    }

    const payload: DailyTask = {
      ...this.currentTask,
      patientId: this.patientId,
      title,
      scheduledTime: this.normalizeTime(this.currentTask.scheduledTime),
      completed: !!this.currentTask.completed,
      notes
    };

    if (this.isDuplicate(payload)) {
      this.openAlert('Duplicate task', 'Same title + type + time already exists.', 'warn');
      return;
    }

    if (this.isEditing && payload.id) {
      this.sub.add(
        this.taskService.updateTask(payload).subscribe({
          next: () => {
            this.closeModal();
            if (form) form.resetForm(); // ✅ reset modal inputs
            this.loadActive();
            this.loadHistory();
            this.openAlert('Saved', 'Task updated ✅', 'success');
          },
          error: (err) => {
            console.error('Update failed:', err);
            this.openAlert('Update failed', 'Update failed. Please try again.', 'error');
          }
        })
      );
    } else {
      this.sub.add(
        this.taskService.addTask(payload).subscribe({
          next: () => {
            this.closeModal();
            if (form) form.resetForm(); // ✅ reset modal inputs
            this.loadActive();
            this.loadHistory();
            this.openAlert('Saved', 'Task added ✅', 'success');
          },
          error: (err) => {
            console.error('Add failed:', err);
            this.openAlert('Add failed', 'Add failed. Please try again.', 'error');
          }
        })
      );
    }
  }

  remove(task: DailyTask): void {
    if (this.isReadOnly) return;
    if (task.id == null) return;

    const id = Number(task.id);

    if (this.activeTab === 'ACTIVE') this.tasks = this.tasks.filter(t => Number(t.id) !== id);
    else this.historyTasks = this.historyTasks.filter(t => Number(t.id) !== id);

    this.sub.add(
      this.taskService.deleteTask(id).subscribe({
        next: () => {
          this.loadActive();
          this.loadHistory();
          this.openAlert('Deleted', 'Task deleted ✅', 'success');
        },
        error: (err) => {
          console.error('Delete error:', err);
          this.loadActive();
          this.loadHistory();
          this.openAlert('Delete issue', 'Refreshing the list...', 'warn');
        }
      })
    );
  }

  toggle(task: DailyTask): void {
    if (this.isReadOnly) return;
    if (this.activeTab !== 'ACTIVE') return;
    if (!task.id) return;

    const newValue = !task.completed;
    task.completed = newValue;

    this.sub.add(
      this.taskService.setCompleted(Number(task.id), newValue).subscribe({
        next: () => {
          this.loadActive();
          this.loadHistory();
        },
        error: (err) => {
          console.error('Toggle failed', err);
          task.completed = !newValue;
          this.openAlert('Update failed', 'Could not update task status.', 'error');
        }
      })
    );
  }

  trackByTaskId(index: number, task: DailyTask) { return task.id; }

  // ---------------- helpers ----------------
  private normalizeTime(time: string): string {
    if (!time) return '08:00';
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return time;

    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const modifier = (match[3] || '').toUpperCase();

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return '08:00';
  }

  private hourOf(time: string): number {
    const t = this.normalizeTime(time);
    const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!m) return -1;
    return parseInt(m[1], 10);
  }

  private timeBucket(hh: number): string {
    const start = hh - (hh % 2);
    const end = start + 2;
    const s = start.toString().padStart(2, '0');
    const e = end.toString().padStart(2, '0');
    return `${s}:00-${e}:00`;
  }

  private normalizeKey(s: string): string {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private isDuplicate(payload: DailyTask): boolean {
    const list = this.tasks;
    const titleKey = this.normalizeKey(payload.title);
    const timeKey = this.normalizeTime(payload.scheduledTime);
    const typeKey = (payload.taskType || 'OTHER').toString();

    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (payload.id && t.id && Number(t.id) === Number(payload.id)) continue;

      const tTitleKey = this.normalizeKey(t.title);
      const tTimeKey = this.normalizeTime(t.scheduledTime);
      const tTypeKey = (t.taskType || 'OTHER').toString();

      if (t.patientId === payload.patientId && tTitleKey === titleKey && tTypeKey === typeKey && tTimeKey === timeKey) {
        return true;
      }
    }
    return false;
  }

  private emptyTask(): DailyTask {
    return { patientId: '', title: '', taskType: '', scheduledTime: '', notes: '', completed: false };
  }
}