import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ActivityService, Activity, ActivityWithUserData } from '../../../../core/services/activity.service';
import { AuthService, User } from '../login/auth.service';
import { UserService, Patient } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';

type RoutinePriority = 'Gentle' | 'Focus' | 'Important';

export interface RoutineActivity {
  id: string;
  name: string;
  type: string;
  duration: number;
  imageUrl: string;
  completed: boolean;
  pinnedAt: string;
  scheduledTime?: string;
  notes?: string;
  priority?: RoutinePriority;
  assignedByUserId?: string;
  assignedByEmail?: string;
  assignedByName?: string;
  assignedByRole?: 'CAREGIVER' | 'DOCTOR' | 'SELF' | string;
  targetPatientId?: string;
  targetPatientEmail?: string;
  targetPatientName?: string;
  completedAt?: string;
  completionNotifiedAt?: string;
  pendingNotifiedAt?: string;
}

export interface RoutineGoal {
  type: string;
  target: number;
  label: string;
}

interface RoutinePatientSummary {
  patient: Patient;
  total: number;
  completed: number;
  pending: number;
  progress: number;
  nextItem?: RoutineActivity;
  overdueCount: number;
}

const DEFAULT_GOALS: RoutineGoal[] = [
  { type: 'Cognitive',   target: 3, label: 'Train your mind' },
  { type: 'Physical',    target: 3, label: 'Move your body' },
  { type: 'Relaxation',  target: 2, label: 'Find your calm' },
  { type: 'Social',      target: 2, label: 'Connect with others' },
  { type: 'Creative',    target: 2, label: 'Express yourself' },
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
  activeRoutinePatient: Patient | null = null;
  patientRoutineSummaries: RoutinePatientSummary[] = [];
  patientRoutineActivities: RoutineActivity[] = [];

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
  readonly ratingStars = [1, 2, 3, 4, 5];
  ratingSubmitting = new Set<string>();

  private filteredActivities: ActivityWithUserData[] = [];

  // Translation and summarization
  translations: { [key: string]: { name: string; description: string; instructions: string[]; benefits: string[]; precautions: string[] } } = {};
  showOriginal: { [key: string]: boolean } = {};
  summaries: { [key: string]: string } = {};
  summaryLoading: { [key: string]: boolean } = {};
  translating: { [key: string]: boolean } = {};

  languages = [
    { code: 'fr', name: 'French', label: 'FR' },
    { code: 'ar', name: 'Arabic', label: 'AR' },
    { code: 'de', name: 'German', label: 'DE' },
    { code: 'zh', name: 'Chinese', label: 'ZH' },
    { code: 'ru', name: 'Russian', label: 'RU' }
  ];
  selectedLang: { [key: string]: string } = {};
  currentTranslationLang: { [key: string]: string } = {};

  // ─── MY ROUTINE ───────────────────────────────────────────────────────────
  showRoutineModal = false;
  routineActivities: RoutineActivity[] = [];
  routineGoals: RoutineGoal[] = DEFAULT_GOALS;
  routineAssignmentNote = '';
  routineAssignmentTime = '';
  routineAssignmentPriority: RoutinePriority = 'Gentle';
  readonly routinePriorities: RoutinePriority[] = ['Gentle', 'Focus', 'Important'];

  // Completion celebration
  showCompletionPopup = false;
  completedActivityName = '';
  completionTimeout: any;
  ratingPopup: { activity: ActivityWithUserData; rating: number; feedback: string; submitting: boolean } | null = null;

  private get routineStorageKey(): string {
    return `routine_${this.userId}`;
  }

  private routineStorageKeyFor(userId?: string | null): string {
    return `routine_${userId || 'unknown'}`;
  }

  constructor(
    private readonly router: Router,
    private activityService: ActivityService,
    private authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService,
    private feedback: AppFeedbackService
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
        } else if (this.userRole === 'CAREGIVER') {
          this.loadDoctorPatients();
          this.loadActivities();
          this.loadRoutine();
          this.showPatientRoutineReminderIfNeeded();
        } else {
          this.loadActivities();
          this.loadRoutine();
          this.showPatientRoutineReminderIfNeeded();
        }
      }
    });
  }

  // ─── ROUTINE PERSISTENCE ──────────────────────────────────────────────────
  private loadRoutine(): void {
    if (this.activeRoutinePatient && this.userRole !== 'PATIENT') {
      this.routineActivities = this.getRoutineActivitiesFor(this.activeRoutinePatient.userId);
      return;
    }

    try {
      const raw = localStorage.getItem(this.routineStorageKey);
      this.routineActivities = raw ? JSON.parse(raw) : [];
    } catch {
      this.routineActivities = [];
    }
  }

  private saveRoutine(): void {
    if (this.activeRoutinePatient && this.userRole !== 'PATIENT') {
      this.saveRoutineActivitiesFor(this.activeRoutinePatient.userId, this.routineActivities);
      this.refreshPatientRoutineSummaries();
      return;
    }

    try {
      localStorage.setItem(this.routineStorageKey, JSON.stringify(this.routineActivities));
    } catch {
      console.error('Failed to save routine');
    }
  }

  private getRoutineActivitiesFor(userId?: string | null): RoutineActivity[] {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(this.routineStorageKeyFor(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveRoutineActivitiesFor(userId: string | undefined, items: RoutineActivity[]): void {
    if (!userId) return;
    try {
      localStorage.setItem(this.routineStorageKeyFor(userId), JSON.stringify(items));
    } catch {
      console.error('Failed to save patient routine');
    }
  }

  // ─── ROUTINE ACTIONS ──────────────────────────────────────────────────────
  openRoutineModal(): void {
    if (this.userRole !== 'PATIENT' && !this.activeRoutinePatient && this.patients.length > 0) {
      this.activeRoutinePatient = this.patients[0];
    }
    this.loadRoutine();
    this.showRoutineModal = true;
  }

  closeRoutineModal(): void {
    this.showRoutineModal = false;
  }

  openPatientRoutineModal(patient: Patient): void {
    this.activeRoutinePatient = patient;
    this.loadRoutine();
    this.showRoutineModal = true;
  }

  selectRoutinePatient(patient: Patient): void {
    this.activeRoutinePatient = patient;
    this.loadRoutine();
  }

  isInRoutine(activityId: string): boolean {
    return this.routineActivities.some(r => r.id === activityId);
  }

  isInPatientRoutine(activityId: string, patient?: Patient): boolean {
    const target = patient || this.selectedPatient[activityId];
    if (!target?.userId) return false;
    return this.getRoutineActivitiesFor(target.userId).some(r => r.id === activityId);
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
      pinnedAt: new Date().toISOString(),
      scheduledTime: this.routineAssignmentTime || undefined,
      notes: this.routineAssignmentNote || undefined,
      priority: this.routineAssignmentPriority,
      assignedByRole: 'SELF',
      assignedByUserId: this.userId || undefined,
      assignedByEmail: this.user?.email,
      assignedByName: this.user?.name
    };
    this.routineActivities = [routineItem, ...this.routineActivities];
    this.saveRoutine();
    this.feedback.success(`"${activity.name}" was added to your routine.`, 'Routine updated');
  }

  pinToPatientRoutine(activity: Activity | ActivityWithUserData, patient: Patient | undefined, event?: Event): void {
    if (event) event.stopPropagation();
    if (!patient?.userId || !this.user) {
      this.feedback.info('Select a patient before pinning a routine.', 'Patient needed');
      return;
    }

    const patientRoutine = this.getRoutineActivitiesFor(patient.userId);
    if (patientRoutine.some(item => item.id === activity.id)) {
      this.feedback.info(`"${activity.name}" is already in ${patient.name}'s routine.`, 'Already pinned');
      return;
    }

    const routineItem: RoutineActivity = {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      duration: activity.duration,
      imageUrl: activity.imageUrl,
      completed: false,
      pinnedAt: new Date().toISOString(),
      scheduledTime: this.routineAssignmentTime || activity.scheduledTime,
      notes: this.routineAssignmentNote || this.getDefaultAssignmentNote(),
      priority: this.routineAssignmentPriority,
      assignedByRole: this.userRole,
      assignedByUserId: this.user.userId,
      assignedByEmail: this.user.email,
      assignedByName: this.user.name,
      targetPatientId: patient.userId,
      targetPatientEmail: patient.email,
      targetPatientName: patient.name
    };

    this.saveRoutineActivitiesFor(patient.userId, [routineItem, ...patientRoutine]);
    this.refreshPatientRoutineSummaries();
    if (this.activeRoutinePatient?.userId === patient.userId) {
      this.routineActivities = this.getRoutineActivitiesFor(patient.userId);
    }

    this.sendRoutineNotification(
      patient,
      'ROUTINE_ASSIGNED',
      `${this.user.name} added "${activity.name}" to your routine${routineItem.scheduledTime ? ` for ${routineItem.scheduledTime}` : ''}.`
    );

    this.feedback.success(`Pinned "${activity.name}" for ${patient.name}.`, 'Routine assigned');
  }

  rateActivity(activity: ActivityWithUserData, rating: number, event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.userId || this.ratingSubmitting.has(activity.id)) return;

    this.ratingSubmitting.add(activity.id);
    this.activityService.rateActivity(this.userId, activity.id, rating).subscribe({
      next: (updatedActivity) => {
        this.applyRatingUpdate(activity.id, rating, updatedActivity.rating, updatedActivity.totalRatings);
        this.openRatingPopup(activity, rating);
        this.ratingSubmitting.delete(activity.id);
      },
      error: (err) => {
        console.error('Failed to rate activity', err);
        this.feedback.error('Could not save your rating. Please try again.', 'Rating failed');
        this.ratingSubmitting.delete(activity.id);
      }
    });
  }

  openRatingPopup(activity: ActivityWithUserData, rating: number): void {
    this.ratingPopup = {
      activity,
      rating,
      feedback: '',
      submitting: false
    };
  }

  closeRatingPopup(): void {
    this.ratingPopup = null;
  }

  skipRatingFeedback(): void {
    this.feedback.info('Thanks for rating. Your score still helps EverCare improve activities.', 'Rating saved');
    this.closeRatingPopup();
  }

  submitRatingFeedback(): void {
    if (!this.ratingPopup || !this.userId) return;
    const comment = this.ratingPopup.feedback.trim();
    if (!comment) {
      this.feedback.info('You can write a short reason or skip feedback for now.', 'Feedback optional');
      return;
    }

    this.ratingPopup.submitting = true;
    this.activityService.saveRatingFeedback({
      activityId: this.ratingPopup.activity.id,
      activityName: this.ratingPopup.activity.name,
      userId: this.userId,
      userName: this.user?.name,
      userEmail: this.user?.email,
      rating: this.ratingPopup.rating,
      feedback: comment
    });
    this.ratingPopup.submitting = false;
    this.feedback.success('We appreciate your feedback. The EverCare team can now review it.', 'Feedback shared');
    this.closeRatingPopup();
  }

  getRatingMoodLabel(rating: number): string {
    if (rating <= 2) return "We're sorry this activity did not feel helpful.";
    if (rating === 3) return 'Thanks for the honest rating. Tell us what could make it better.';
    return 'We appreciate your rating. Tell us what worked well for you.';
  }

  getRatingMoodClass(rating: number): string {
    if (rating <= 2) return 'is-low';
    if (rating === 3) return 'is-mid';
    return 'is-high';
  }

  getRatingLabel(activity: ActivityWithUserData): string {
    if (activity.userRating) {
      return `Your rating: ${activity.userRating}/5`;
    }
    return 'Tap to rate';
  }

  private applyRatingUpdate(activityId: string, userRating: number, rating: number, totalRatings: number): void {
    const update = (activity: ActivityWithUserData) => {
      if (activity.id === activityId) {
        activity.userRating = userRating;
        activity.rating = rating;
        activity.totalRatings = totalRatings;
      }
    };

    this.allActivities.forEach(update);
    this.todayActivities.forEach(update);
    this.recommendedActivities.forEach(update);
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
    routine.completedAt = new Date().toISOString();
    this.notifyRoutineCompletion(routine);
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
    this.routineActivities = this.routineActivities.map(r => ({
      ...r,
      completed: false,
      completedAt: undefined,
      completionNotifiedAt: undefined
    }));
    this.saveRoutine();
  }

  sendRoutineReminder(patient: Patient, event?: Event): void {
    if (event) event.stopPropagation();
    const pendingCount = this.getRoutineActivitiesFor(patient.userId).filter(item => !item.completed).length;
    if (!pendingCount) {
      this.feedback.info(`${patient.name} has no pending routine items.`, 'Routine complete');
      return;
    }

    this.sendRoutineNotification(
      patient,
      'ROUTINE_REMINDER',
      `${this.user?.name || 'Your care team'} reminded you to finish ${pendingCount} routine item${pendingCount !== 1 ? 's' : ''} today.`
    );
    this.feedback.success(`Routine reminder sent to ${patient.name}.`, 'Reminder sent');
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

  getAssignedRoutineCount(): number {
    return this.routineActivities.filter(item => !!item.assignedByUserId && item.assignedByRole !== 'SELF').length;
  }

  getRoutineReminderText(): string {
    const left = this.routineActivities.filter(item => !item.completed).length;
    if (!left) return 'All routine items are complete. Beautiful work.';
    return `${left} routine item${left !== 1 ? 's' : ''} still need${left === 1 ? 's' : ''} attention today.`;
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
      this.refreshPatientRoutineSummaries();
      return;
    }
    forkJoin(this.user.patientEmails.map(email => this.userService.getUserByEmail(email)))
      .subscribe({
      next: (patients) => {
        this.patients = patients;
        if (!this.activeRoutinePatient && patients.length) {
          this.activeRoutinePatient = patients[0];
        }
        this.refreshPatientRoutineSummaries();
        this.notifyCaregiverAboutPendingRoutines();
      },
      error: (err) => {
        console.error('Failed to load associated patients', err);
        this.feedback.error('Could not load associated patients. Please refresh and try again.', 'Patients unavailable');
      }
    });
  }

  loadDoctorActivities(): void {
    this.activityService.getAllActivities().subscribe({
      next: (acts) => {
        this.doctorActivities = acts;
      },
      error: (err) => {
        console.error('Failed to load doctor activities', err);
        this.feedback.error('Could not load the activity catalog. Please try again.', 'Activities unavailable');
      }
    });
  }

  loadActivities(): void {
    if (!this.userId) return;
    this.activityService.getActivitiesForUser(this.userId).subscribe({
      next: (data) => {
        this.allActivities = data;
        this.recommendedActivities = data.filter(a => a.recommendedByDoctor);
        this.types = [...new Set(data.map(a => a.type))];
        this.difficulties = [...new Set(data.map(a => a.difficulty))];
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to load activities', err);
        this.feedback.error('Could not load activities right now. Please try again.', 'Activities unavailable');
      }
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
        this.feedback.success('Activity recommended to the selected patient.', 'Recommendation sent');
        this.recommending.delete(activity.id);
      },
      error: () => {
        this.feedback.error('Recommendation failed. Please try again.', 'Activity recommendation');
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
        this.feedback.success('Activity marked as completed.', 'Progress updated');
      },
      error: (err) => {
        console.error('Complete failed', err);
        this.feedback.error('Failed to mark complete. Please try again.', 'Progress update failed');
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

  getPatientRoutineSummary(patient: Patient): RoutinePatientSummary {
    const routine = this.getRoutineActivitiesFor(patient.userId);
    const total = routine.length;
    const completed = routine.filter(item => item.completed).length;
    const pending = total - completed;
    const nextItem = routine.find(item => !item.completed);
    return {
      patient,
      total,
      completed,
      pending,
      progress: total ? Math.round((completed / total) * 100) : 0,
      nextItem,
      overdueCount: routine.filter(item => !item.completed && this.isRoutineItemDue(item)).length
    };
  }

  private refreshPatientRoutineSummaries(): void {
    this.patientRoutineSummaries = this.patients.map(patient => this.getPatientRoutineSummary(patient));
  }

  private isRoutineItemDue(item: RoutineActivity): boolean {
    if (!item.scheduledTime) return false;
    const [hour, minute] = item.scheduledTime.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
    const due = new Date();
    due.setHours(hour, minute, 0, 0);
    return Date.now() > due.getTime();
  }

  private getDefaultAssignmentNote(): string {
    if (this.userRole === 'DOCTOR') return 'Recommended by your doctor as part of your wellness plan.';
    if (this.userRole === 'CAREGIVER') return 'Pinned by your caregiver to support today\'s routine.';
    return '';
  }

  private sendRoutineNotification(patient: Patient, action: string, details: string): void {
    const targetUserIds = [patient.userId, patient.email].filter((value): value is string => !!value);
    this.notificationService.sendNotification({
      activityId: patient.userId || 'routine',
      action,
      details,
      targetUserIds
    }).subscribe({
      error: (err) => console.error('Failed to send routine notification', err)
    });
  }

  private notifyRoutineCompletion(routine: RoutineActivity): void {
    if (!routine.assignedByEmail && !routine.assignedByUserId) return;
    if (routine.assignedByRole === 'SELF' || routine.completionNotifiedAt) return;

    routine.completionNotifiedAt = new Date().toISOString();
    const targetUserIds = [routine.assignedByUserId, routine.assignedByEmail].filter((value): value is string => !!value);
    this.notificationService.sendNotification({
      activityId: routine.id,
      action: 'ROUTINE_COMPLETED',
      details: `${this.user?.name || routine.targetPatientName || 'A patient'} checked "${routine.name}" in their routine.`,
      targetUserIds
    }).subscribe({
      error: (err) => console.error('Failed to notify routine completion', err)
    });
  }

  private notifyCaregiverAboutPendingRoutines(): void {
    if (!this.user || !['CAREGIVER', 'DOCTOR'].includes(this.userRole)) return;
    const now = Date.now();
    const intervalMs = 4 * 60 * 60 * 1000;

    this.patients.forEach(patient => {
      const items = this.getRoutineActivitiesFor(patient.userId);
      let changed = false;
      items.forEach(item => {
        if (item.completed || !item.assignedByUserId || item.assignedByUserId !== this.user?.userId) return;
        if (!this.isRoutineItemDue(item)) return;
        const last = item.pendingNotifiedAt ? new Date(item.pendingNotifiedAt).getTime() : 0;
        if (now - last < intervalMs) return;

        item.pendingNotifiedAt = new Date().toISOString();
        changed = true;
        this.notificationService.sendNotification({
          activityId: item.id,
          action: 'ROUTINE_PENDING',
          details: `${patient.name} has not checked "${item.name}" yet.`,
          targetUserIds: [this.user.userId, this.user.email].filter((value): value is string => !!value)
        }).subscribe({
          error: (err) => console.error('Failed to notify routine pending status', err)
        });
      });
      if (changed) {
        this.saveRoutineActivitiesFor(patient.userId, items);
      }
    });
  }

  private showPatientRoutineReminderIfNeeded(): void {
    if (this.userRole !== 'PATIENT') return;
    setTimeout(() => {
      this.loadRoutine();
      const pending = this.routineActivities.filter(item => !item.completed);
      if (!pending.length) return;
      const assigned = pending.find(item => item.assignedByRole && item.assignedByRole !== 'SELF');
      const source = assigned?.assignedByName ? ` from ${assigned.assignedByName}` : '';
      this.feedback.info(`You have ${pending.length} routine item${pending.length !== 1 ? 's' : ''}${source} waiting today.`, 'Routine reminder');
    }, 1200);
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
        this.feedback.success(`Activity translated to ${this.getLanguageName(lang)}.`, 'Translation ready');
      },
      error: (err) => {
        console.error('Translation failed', err);
        this.feedback.error('Translation failed. Please try again.', 'Translation unavailable');
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
        this.feedback.info(summary, 'Activity summary');
      },
      error: (err) => {
        console.error('Summarization failed', err);
        this.feedback.error('Summarization failed. Please try again.', 'Summary unavailable');
        this.summaryLoading[activity.id] = false;
      }
    });
  }
}
