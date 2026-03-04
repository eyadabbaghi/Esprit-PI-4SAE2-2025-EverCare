import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { ActivityService, Activity, ActivityWithUserData } from '../../../../core/services/activity.service';
import { AuthService, User } from '../login/auth.service';
import { UserService, Patient } from '../../../../core/services/user.service';

export interface RoutineActivity {
  id: string;
  name: string;
  type: string;
  duration: number;
  imageUrl: string;
  completed: boolean;
  pinnedAt: string;
}

export interface RoutineGoal {
  type: string;
  target: number;
  label: string;
  emoji: string;
}

const DEFAULT_GOALS: RoutineGoal[] = [
  { type: 'Cognitive',   target: 3, label: 'Train your mind',   emoji: '🧠' },
  { type: 'Physical',    target: 3, label: 'Move your body',    emoji: '💪' },
  { type: 'Relaxation',  target: 2, label: 'Find your calm',    emoji: '🧘' },
  { type: 'Social',      target: 2, label: 'Connect with others', emoji: '🤝' },
  { type: 'Creative',    target: 2, label: 'Express yourself',  emoji: '🎨' },
];

@Component({
  selector: 'app-activities',
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.css'],
})
export class ActivitiesComponent implements OnInit {
  // Role-specific data
  userRole: string = '';
  user: User | null = null;
  userId: string | null = null;
  patients: Patient[] = [];
  recommending = new Set<string>();
  doctorActivities: Activity[] = [];

  // Doctor dropdown state
  patientDropdownOpen: string | null = null;
  selectedPatient: { [key: string]: Patient } = {};

  // Shared activity data
  allActivities: ActivityWithUserData[] = [];
  todayActivities: ActivityWithUserData[] = [];
  recommendedActivities: ActivityWithUserData[] = [];

  // Filter properties
  searchTerm: string = '';
  selectedType: string = 'all';
  selectedDifficulty: string = 'all';

  // Available filter options
  types: string[] = [];
  difficulties: string[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 6;
  totalPages: number = 1;

  private filteredActivities: ActivityWithUserData[] = [];

  // Translation and summarization
  translations: { [key: string]: { name: string; description: string; instructions: string[]; benefits: string[]; precautions: string[] } } = {};
  showOriginal: { [key: string]: boolean } = {};
  summaries: { [key: string]: string } = {};
  summaryLoading: { [key: string]: boolean } = {};
  translating: { [key: string]: boolean } = {};

  languages = [
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' }
  ];
  selectedLang: { [key: string]: string } = {};
  currentTranslationLang: { [key: string]: string } = {};

  // ─── MY ROUTINE ───────────────────────────────────────────────────────────
  showRoutineModal = false;
  routineActivities: RoutineActivity[] = [];
  routineGoals: RoutineGoal[] = DEFAULT_GOALS;

  // Completion celebration
  showCompletionPopup = false;
  completedActivityName = '';
  completionTimeout: any;

  private get routineStorageKey(): string {
    return `routine_${this.userId}`;
  }

  constructor(
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private activityService: ActivityService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user && user.userId) {
        this.user = user;
        this.userId = user.userId;
        this.userRole = user.role;

        if (this.userRole === 'DOCTOR') {
          this.loadDoctorPatients();
          this.loadDoctorActivities();
        } else {
          this.loadActivities();
          this.loadRoutine();
        }
      }
    });
  }

  // ─── ROUTINE PERSISTENCE ──────────────────────────────────────────────────
  private loadRoutine(): void {
    try {
      const raw = localStorage.getItem(this.routineStorageKey);
      this.routineActivities = raw ? JSON.parse(raw) : [];
    } catch {
      this.routineActivities = [];
    }
  }

  private saveRoutine(): void {
    try {
      localStorage.setItem(this.routineStorageKey, JSON.stringify(this.routineActivities));
    } catch {
      console.error('Failed to save routine');
    }
  }

  // ─── ROUTINE ACTIONS ──────────────────────────────────────────────────────
  openRoutineModal(): void {
    this.showRoutineModal = true;
  }

  closeRoutineModal(): void {
    this.showRoutineModal = false;
  }

  isInRoutine(activityId: string): boolean {
    return this.routineActivities.some(r => r.id === activityId);
  }

  pinToRoutine(activity: ActivityWithUserData, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.isInRoutine(activity.id)) return;

    const routineItem: RoutineActivity = {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      duration: activity.duration,
      imageUrl: activity.imageUrl,
      completed: false,
      pinnedAt: new Date().toISOString()
    };
    this.routineActivities = [routineItem, ...this.routineActivities];
    this.saveRoutine();
    this.toastr.success(`"${activity.name}" added to your routine! 📌`);
  }

  unpinFromRoutine(activityId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.routineActivities = this.routineActivities.filter(r => r.id !== activityId);
    this.saveRoutine();
  }

  completeRoutineActivity(routine: RoutineActivity, event?: Event): void {
    if (event) event.stopPropagation();
    if (routine.completed) return;

    routine.completed = true;
    this.saveRoutine();

    // Show celebration popup
    this.completedActivityName = routine.name;
    this.showCompletionPopup = true;
    if (this.completionTimeout) clearTimeout(this.completionTimeout);
    this.completionTimeout = setTimeout(() => {
      this.showCompletionPopup = false;
    }, 3500);
  }

  resetRoutineProgress(): void {
    this.routineActivities = this.routineActivities.map(r => ({ ...r, completed: false }));
    this.saveRoutine();
  }

  // ─── ROUTINE STATS ────────────────────────────────────────────────────────
  getRoutineCompletedCount(): number {
    return this.routineActivities.filter(r => r.completed).length;
  }

  getRoutineTotalCount(): number {
    return this.routineActivities.length;
  }

  getOverallProgress(): number {
    const total = this.routineActivities.length;
    if (total === 0) return 0;
    return Math.round((this.getRoutineCompletedCount() / total) * 100);
  }

  getTypeProgress(type: string): number {
    const typeItems = this.routineActivities.filter(r => r.type === type);
    if (typeItems.length === 0) return 0;
    const completed = typeItems.filter(r => r.completed).length;
    return Math.round((completed / typeItems.length) * 100);
  }

  getTypeCompleted(type: string): number {
    return this.routineActivities.filter(r => r.type === type && r.completed).length;
  }

  getTypeTotal(type: string): number {
    return this.routineActivities.filter(r => r.type === type).length;
  }

  getGoalProgress(goal: RoutineGoal): number {
    const completed = this.getTypeCompleted(goal.type);
    return Math.min(100, Math.round((completed / goal.target) * 100));
  }

  isGoalMet(goal: RoutineGoal): boolean {
    return this.getTypeCompleted(goal.type) >= goal.target;
  }

  getActiveGoals(): RoutineGoal[] {
    // Only show goals for types that exist in routine OR all goals
    return this.routineGoals;
  }

  getRoutineByType(type: string): RoutineActivity[] {
    return this.routineActivities.filter(r => r.type === type);
  }

  getUniqueRoutineTypes(): string[] {
    return [...new Set(this.routineActivities.map(r => r.type))];
  }

  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'Cognitive':  '#7C3AED',
      'Physical':   '#059669',
      'Relaxation': '#0284C7',
      'Social':     '#DB2777',
      'Creative':   '#D97706',
    };
    return colors[type] || '#6B7280';
  }

  getTypeBgClass(type: string): string {
    const classes: { [key: string]: string } = {
      'Cognitive':  'bg-purple-100 text-purple-700',
      'Physical':   'bg-green-100 text-green-700',
      'Relaxation': 'bg-blue-100 text-blue-700',
      'Social':     'bg-pink-100 text-pink-700',
      'Creative':   'bg-orange-100 text-orange-700',
    };
    return classes[type] || 'bg-gray-100 text-gray-700';
  }

  // ─── ORIGINAL METHODS ─────────────────────────────────────────────────────
  loadDoctorPatients(): void {
    if (!this.user?.patientEmails?.length) {
      this.patients = [];
      return;
    }
    forkJoin(this.user.patientEmails.map(email => this.userService.getUserByEmail(email)))
      .subscribe(patients => this.patients = patients);
  }

  loadDoctorActivities(): void {
    this.activityService.getAllActivities().subscribe(acts => {
      this.doctorActivities = acts;
    });
  }

  loadActivities(): void {
    if (!this.userId) return;
    this.activityService.getActivitiesForUser(this.userId).subscribe(data => {
      this.allActivities = data;
      this.recommendedActivities = data.filter(a => a.recommendedByDoctor);
      this.types = [...new Set(data.map(a => a.type))];
      this.difficulties = [...new Set(data.map(a => a.difficulty))];
      this.applyFilters();
    });
  }

  togglePatientDropdown(activityId: string): void {
    this.patientDropdownOpen = this.patientDropdownOpen === activityId ? null : activityId;
  }

  selectPatient(activityId: string, patient: Patient): void {
    this.selectedPatient[activityId] = patient;
    this.patientDropdownOpen = null;
  }

  recommend(activity: Activity, patientId: string): void {
    if (!this.user?.userId || !patientId) return;
    if (this.recommending.has(activity.id)) return;

    this.recommending.add(activity.id);
    this.activityService.recommendActivity(this.user.userId, patientId, activity.id).subscribe({
      next: () => {
        this.toastr.success('Activity recommended');
        this.recommending.delete(activity.id);
      },
      error: () => {
        this.toastr.error('Recommendation failed');
        this.recommending.delete(activity.id);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.allActivities.filter(a => !a.recommendedByDoctor);

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term)
      );
    }
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === this.selectedType);
    }
    if (this.selectedDifficulty !== 'all') {
      filtered = filtered.filter(a => a.difficulty === this.selectedDifficulty);
    }

    this.filteredActivities = filtered;
    this.currentPage = 1;
    this.totalPages = Math.max(1, Math.ceil(this.filteredActivities.length / this.pageSize));
    this.updatePage();
  }

  private updatePage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.todayActivities = this.filteredActivities.slice(start, start + this.pageSize);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedType = 'all';
    this.selectedDifficulty = 'all';
    this.applyFilters();
  }

  getCompletionRate(): number {
    const total = this.todayActivities.length;
    const completed = this.todayActivities.filter(a => a.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  getCompletedTodayCount(): number {
    return this.todayActivities.filter(a => a.completed).length;
  }

  completeActivity(activity: ActivityWithUserData, event?: Event): void {
    if (event) event.stopPropagation();
    if (activity.completed || !this.userId) return;
    this.activityService.markCompleted(this.userId, activity.id).subscribe({
      next: () => {
        activity.completed = true;
        activity.completedAt = new Date().toISOString();
        this.toastr.success('Activity marked as completed');
      },
      error: (err) => {
        console.error('Complete failed', err);
        this.toastr.error('Failed to mark complete');
      }
    });
  }

  viewDetails(activity: ActivityWithUserData): void {
    this.router.navigate(['/activities', activity.id]);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePage();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePage();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePage();
    }
  }

  getImageUrl(relativePath: string): string {
    if (!relativePath) return '/assets/logo.png';
    if (relativePath.startsWith('http')) return relativePath;
    return `${this.activityService.apiUrl}${relativePath}`;
  }

  translateActivity(activity: ActivityWithUserData, lang: string): void {
    if (this.translating[activity.id]) return;

    if (this.translations[activity.id] && this.currentTranslationLang[activity.id] === lang) {
      this.showOriginal[activity.id] = !this.showOriginal[activity.id];
      return;
    }

    this.translating[activity.id] = true;
    this.activityService.translateActivity(activity.id, lang).subscribe({
      next: (translated) => {
        this.translations[activity.id] = {
          name: translated.name,
          description: translated.description,
          instructions: translated.instructions,
          benefits: translated.benefits,
          precautions: translated.precautions
        };
        this.currentTranslationLang[activity.id] = lang;
        this.showOriginal[activity.id] = false;
        this.translating[activity.id] = false;
        this.toastr.success(`Activity translated to ${this.getLanguageName(lang)}`);
      },
      error: (err) => {
        console.error('Translation failed', err);
        this.toastr.error('Translation failed');
        this.translating[activity.id] = false;
      }
    });
  }

  toggleOriginal(activityId: string): void {
    this.showOriginal[activityId] = !this.showOriginal[activityId];
  }

  getLanguageName(code: string): string {
    const lang = this.languages.find(l => l.code === code);
    return lang ? lang.name : code;
  }

  summarizeActivity(activity: ActivityWithUserData): void {
    if (this.summaryLoading[activity.id]) return;
    this.summaryLoading[activity.id] = true;
    this.activityService.summarizeActivity(activity.id).subscribe({
      next: (summary) => {
        this.summaries[activity.id] = summary;
        this.summaryLoading[activity.id] = false;
        this.toastr.info(summary, 'Summary', { timeOut: 10000 });
      },
      error: (err) => {
        console.error('Summarization failed', err);
        this.toastr.error('Summarization failed');
        this.summaryLoading[activity.id] = false;
      }
    });
  }
}