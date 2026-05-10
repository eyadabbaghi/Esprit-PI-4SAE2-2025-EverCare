import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ActivityService, ActivityWithUserData } from '../../../../core/services/activity.service';
import { AuthService } from '../login/auth.service';
import { RoutineActivity } from '../activities/activities.component';
import { AppFeedbackService } from '../../../../core/services/app-feedback.service';

@Component({
  selector: 'app-activity-details',
  templateUrl: './activity-details.component.html',
  styleUrls: ['./activity-details.component.css'],
})
export class ActivityDetailsComponent implements OnInit {
  activity: ActivityWithUserData | null = null;
  userRating = 0;
  userId: string | null = null;
  user: any = null;
  Math = Math;
  ratingSubmitting = false;
  ratingPopup: { rating: number; feedback: string; submitting: boolean } | null = null;

  // Translation and summarization
  languages = [
    { code: 'fr', name: 'French', label: 'FR' },
    { code: 'ar', name: 'Arabic', label: 'AR' },
    { code: 'de', name: 'German', label: 'DE' },
    { code: 'zh', name: 'Chinese', label: 'ZH' },
    { code: 'ru', name: 'Russian', label: 'RU' }
  ];
  selectedLang: string = 'fr';
  translatedActivity: any = null;
  showOriginal: boolean = true;
  translating: boolean = false;
  currentTranslationLang: string = '';

  summary: string = '';
  summaryLoading: boolean = false;
  showSummaryModal: boolean = false;

  // ─── ROUTINE ──────────────────────────────────────────────────────────────
  isInRoutine: boolean = false;
  pinAnimating: boolean = false;
  showPinToast: boolean = false;

  private get routineStorageKey(): string {
    return `routine_${this.userId}`;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private activityService: ActivityService,
    private authService: AuthService,
    private feedback: AppFeedbackService
  ) {}

  ngOnInit(): void {
    const activityId = this.route.snapshot.paramMap.get('id');
    if (!activityId) {
      this.router.navigate(['/activities']);
      return;
    }

    this.authService.currentUser$.subscribe(user => {
      if (user && user.userId) {
        this.user = user;
        this.userId = user.userId;
        this.loadActivity(activityId);
        this.checkRoutineStatus(activityId);
      }
    });
  }

  loadActivity(activityId: string): void {
    if (!this.userId) return;
    this.activityService.getActivityForUser(this.userId, activityId).subscribe({
      next: (data) => {
        this.activity = data;
        this.userRating = data.userRating || 0;
        this.checkRoutineStatus(data.id);
      },
      error: (err) => {
        console.error('Failed to load activity', err);
        this.toastr.error('Activity not found');
        this.router.navigate(['/activities']);
      }
    });
  }

  // ─── ROUTINE METHODS ──────────────────────────────────────────────────────
  private getRoutineActivities(): RoutineActivity[] {
    try {
      const raw = localStorage.getItem(this.routineStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveRoutineActivities(items: RoutineActivity[]): void {
    try {
      localStorage.setItem(this.routineStorageKey, JSON.stringify(items));
    } catch {
      console.error('Failed to save routine');
    }
  }

  checkRoutineStatus(activityId: string): void {
    const items = this.getRoutineActivities();
    this.isInRoutine = items.some(r => r.id === activityId);
  }

  toggleRoutine(): void {
    if (!this.activity || !this.userId) return;

    this.pinAnimating = true;
    setTimeout(() => this.pinAnimating = false, 400);

    const items = this.getRoutineActivities();

    if (this.isInRoutine) {
      const updated = items.filter(r => r.id !== this.activity!.id);
      this.saveRoutineActivities(updated);
      this.isInRoutine = false;
      this.toastr.info(`"${this.activity.name}" removed from your routine`);
    } else {
      const newItem: RoutineActivity = {
        id: this.activity.id,
        name: this.activity.name,
        type: this.activity.type,
        duration: this.activity.duration,
        imageUrl: this.activity.imageUrl,
        completed: false,
        pinnedAt: new Date().toISOString()
      };
      items.unshift(newItem);
      this.saveRoutineActivities(items);
      this.isInRoutine = true;

      // Show inline toast
      this.showPinToast = true;
      setTimeout(() => this.showPinToast = false, 2500);
    }
  }

  // ─── ORIGINAL METHODS ─────────────────────────────────────────────────────
  backToList(): void {
    this.router.navigate(['/activities']);
  }

  rate(rating: number): void {
    if (!this.activity || !this.userId || this.ratingSubmitting) return;
    this.ratingSubmitting = true;
    this.activityService.rateActivity(this.userId, this.activity.id, rating).subscribe({
      next: (updated) => {
        this.activity!.rating = updated.rating;
        this.activity!.totalRatings = updated.totalRatings;
        this.userRating = rating;
        this.ratingSubmitting = false;
        this.openRatingPopup(rating);
      },
      error: (err) => {
        console.error('Rate failed', err);
        this.ratingSubmitting = false;
        this.feedback.error('Failed to submit rating. Please try again.', 'Rating failed');
      }
    });
  }

  openRatingPopup(rating: number): void {
    this.ratingPopup = { rating, feedback: '', submitting: false };
  }

  closeRatingPopup(): void {
    this.ratingPopup = null;
  }

  skipRatingFeedback(): void {
    this.feedback.info('Thanks for rating. Your score helps EverCare improve activities.', 'Rating saved');
    this.closeRatingPopup();
  }

  submitRatingFeedback(): void {
    if (!this.activity || !this.ratingPopup) return;
    const comment = this.ratingPopup.feedback.trim();
    if (!comment) {
      this.feedback.info('You can write a short reason or skip feedback for now.', 'Feedback optional');
      return;
    }

    this.ratingPopup.submitting = true;
    this.activityService.saveRatingFeedback({
      activityId: this.activity.id,
      activityName: this.activity.name,
      userId: this.userId || undefined,
      userName: this.user?.name,
      userEmail: this.user?.email,
      rating: this.ratingPopup.rating,
      feedback: comment
    });
    this.ratingPopup.submitting = false;
    this.feedback.success('We appreciate the feedback. The EverCare team can now review it.', 'Feedback shared');
    this.closeRatingPopup();
  }

  getRatingMoodLabel(rating: number): string {
    if (rating <= 2) return "We're sorry this activity did not feel right.";
    if (rating === 3) return 'Thanks for the honest rating.';
    return 'We appreciate your rating.';
  }

  getRatingMoodClass(rating: number): string {
    if (rating <= 2) return 'is-low';
    if (rating === 3) return 'is-mid';
    return 'is-high';
  }

  getImageUrl(relativePath: string): string {
    if (!relativePath) return '/assets/logo.png';
    if (relativePath.startsWith('http')) return relativePath;
    return `${this.activityService.apiUrl}${relativePath}`;
  }

  translate(lang: string = this.selectedLang): void {
    if (!this.activity || this.translating) return;
    if (this.translatedActivity && this.currentTranslationLang === lang) {
      this.showOriginal = !this.showOriginal;
      return;
    }
    this.translating = true;
    this.activityService.translateActivity(this.activity.id, lang).subscribe({
      next: (translated) => {
        this.translatedActivity = translated;
        this.currentTranslationLang = lang;
        this.showOriginal = false;
        this.translating = false;
        this.feedback.success(`Activity translated to ${this.getLanguageName(lang)}.`, 'Translation ready');
      },
      error: (err) => {
        console.error('Translation failed', err);
        this.feedback.error('Translation failed. Please try again.', 'Translation unavailable');
        this.translating = false;
      }
    });
  }

  getLanguageName(code: string): string {
    const lang = this.languages.find(l => l.code === code);
    return lang ? lang.name : code;
  }

  summarize(): void {
    if (!this.activity || this.summaryLoading) return;
    this.summaryLoading = true;
    this.activityService.summarizeActivity(this.activity.id).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.summaryLoading = false;
        this.showSummaryModal = true;
      },
      error: (err) => {
        console.error('Summarization failed', err);
        this.feedback.error('Summarization failed. Please try again.', 'Summary unavailable');
        this.summaryLoading = false;
      }
    });
  }

  closeSummaryModal(): void {
    this.showSummaryModal = false;
  }
}
