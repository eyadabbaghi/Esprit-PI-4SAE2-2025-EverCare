import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, forkJoin } from 'rxjs';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { AssessmentService } from '../../../medical-record/services/assessment.service';
import { MedicalRecord } from '../../../medical-record/models/medical-record.model';
import { MedicalRecordService } from '../../../medical-record/services/medical-record.service';
import {
  CognitiveGame,
  CognitiveGameType,
  CognitiveProgress,
  CreateGameSessionRequest,
  GameSession,
} from '../../models/cognitive-stimulation.model';
import { CognitiveStimulationService } from '../../services/cognitive-stimulation.service';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { getGameMedia } from '../../utils/cognitive-game-media';

type UserRole = 'PATIENT' | 'CAREGIVER' | 'DOCTOR' | 'ADMIN' | null;

@Component({
  selector: 'app-cognitive-plan',
  templateUrl: './cognitive-plan.component.html',
  styleUrl: './cognitive-plan.component.css'
})
export class CognitivePlanComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly sessionForm = this.formBuilder.group({
    cognitiveGameId: this.formBuilder.control('', Validators.required),
    playerAnswer: this.formBuilder.control('', Validators.maxLength(2000)),
    correct: this.formBuilder.control(true, Validators.required),
    score: this.formBuilder.control(80, [Validators.required, Validators.min(0), Validators.max(100)]),
    difficultyAtPlay: this.formBuilder.control(1, [Validators.required, Validators.min(1), Validators.max(5)]),
    assistanceNeeded: this.formBuilder.control(false, Validators.required),
    frustrationLevel: this.formBuilder.control(2, [Validators.required, Validators.min(1), Validators.max(5)]),
    enjoymentLevel: this.formBuilder.control(4, [Validators.required, Validators.min(1), Validators.max(5)]),
    abandoned: this.formBuilder.control(false, Validators.required),
    notes: this.formBuilder.control('', Validators.maxLength(2000)),
  });

  readonly gameTypeLabels: Record<CognitiveGameType, string> = {
    MEMORY: 'Memory',
    LANGUAGE: 'Language',
    LOGIC: 'Logic',
    ATTENTION: 'Attention',
    PRAXIS: 'Praxis',
    GNOSIS: 'Recognition',
  };

  currentUser: User | null = null;
  currentRole: UserRole = null;
  currentRecord: MedicalRecord | null = null;
  patientDisplayName = '';
  progress: CognitiveProgress | null = null;
  recommendedGames: CognitiveGame[] = [];
  sessions: GameSession[] = [];

  recordRouteId: string | null = null;
  patientIdentifierCandidates: string[] = [];
  selectedGame: CognitiveGame | null = null;

  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  infoMessage = '';
  successMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly assessmentService: AssessmentService,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly cognitiveService: CognitiveStimulationService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.infoMessage = 'Loading cognitive follow-up in the browser...';
      return;
    }

    combineLatest([this.authService.currentUser$, this.route.paramMap]).subscribe(([user, params]) => {
      const resolvedUser = user ?? this.readStoredUser();
      this.currentUser = resolvedUser;
      this.currentRole = this.normalizeRole(resolvedUser?.role) ?? this.normalizeRole(this.readStoredRole());
      this.patientIdentifierCandidates = this.resolvePatientIdentifierCandidates(resolvedUser);
      this.recordRouteId = params.get('medicalRecordId');
      this.bootstrapView();
    });
  }

  get canSubmitSession(): boolean {
    if (!this.currentRecord?.active) {
      return false;
    }

    return this.currentRole === 'PATIENT' || this.currentRole === 'CAREGIVER';
  }

  get isDoctorView(): boolean {
    return this.currentRole === 'DOCTOR' || this.currentRole === 'ADMIN';
  }

  selectGame(game: CognitiveGame): void {
    this.selectedGame = game;
    this.sessionForm.patchValue({
      cognitiveGameId: game.id,
      difficultyAtPlay: game.difficultyLevel,
    });
  }

  submitSession(): void {
    if (!this.currentRecord || !this.canSubmitSession || this.sessionForm.invalid || this.isSubmitting) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    const rawValue = this.sessionForm.getRawValue();
    const payload: CreateGameSessionRequest = {
      cognitiveGameId: rawValue.cognitiveGameId,
      playerAnswer: rawValue.playerAnswer.trim() || null,
      correct: rawValue.correct,
      score: rawValue.score,
      difficultyAtPlay: rawValue.difficultyAtPlay,
      assistanceNeeded: rawValue.assistanceNeeded,
      frustrationLevel: rawValue.frustrationLevel,
      enjoymentLevel: rawValue.enjoymentLevel,
      abandoned: rawValue.abandoned,
      notes: rawValue.notes.trim() || null,
    };

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cognitiveService.createSession(this.currentRecord.id, payload).subscribe({
      next: () => {
        this.successMessage = 'The cognitive session was saved.';
        this.isSubmitting = false;
        this.resetSessionForm();
        this.loadCognitiveData(this.currentRecord!.id);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Unable to save the session.');
        this.isSubmitting = false;
      }
    });
  }

  removeSession(session: GameSession): void {
    if (!this.isDoctorView) {
      return;
    }

    this.cognitiveService.deleteSession(session.id).subscribe({
      next: () => {
        if (this.currentRecord) {
          this.successMessage = 'The session was deleted.';
          this.loadCognitiveData(this.currentRecord.id);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Unable to delete the session.');
      }
    });
  }

  labelForType(type: CognitiveGameType | null | undefined): string {
    if (!type) {
      return '-';
    }
    return this.gameTypeLabels[type] ?? type;
  }

  imageForGame(game: CognitiveGame | null | undefined): string {
    return getGameMedia(game).imageUrl;
  }

  themeClassForGame(game: CognitiveGame | null | undefined): string {
    return getGameMedia(game).themeClass;
  }

  helperTextForGame(game: CognitiveGame | null | undefined): string {
    return getGameMedia(game).helperText;
  }

  private bootstrapView(): void {
    this.resetViewMessages();

    if (this.recordRouteId) {
      this.loadRecordById(this.recordRouteId);
      return;
    }

    if (this.shouldAutoLoadOwnRecord()) {
      this.loadOwnRecord();
      return;
    }

    this.currentRecord = null;
    this.patientDisplayName = '';
    this.progress = null;
    this.recommendedGames = [];
    this.sessions = [];
    this.infoMessage = 'Open this view from a medical record to review a patient cognitive progress.';
  }

  private shouldAutoLoadOwnRecord(): boolean {
    return this.currentRole === 'PATIENT' || this.currentRole === 'CAREGIVER';
  }

  private loadRecordById(recordId: string): void {
    this.isLoading = true;

    this.medicalRecordService.getById(recordId).subscribe({
      next: (record) => {
        if (this.currentRole === 'PATIENT' && !this.isOwnRecord(record)) {
          this.currentRecord = null;
          this.isLoading = false;
          this.errorMessage = 'You can only view your own cognitive follow-up.';
          return;
        }

        this.currentRecord = record;
        this.resolvePatientDisplayName(record.patientId);
        this.loadCognitiveData(record.id);
      },
      error: (error: HttpErrorResponse) => {
        this.currentRecord = null;
        this.isLoading = false;
        this.errorMessage = this.extractError(error, 'Unable to load the linked medical record.');
      }
    });
  }

  private loadOwnRecord(): void {
    this.currentRecord = null;
    this.patientDisplayName = '';
    this.progress = null;
    this.recommendedGames = [];
    this.sessions = [];
    this.isLoading = true;

    if (this.patientIdentifierCandidates.length === 0) {
      this.isLoading = false;
      this.infoMessage = 'No medical record is associated with your session.';
      return;
    }

    this.tryLoadOwnRecordCandidate(0, false);
  }

  private tryLoadOwnRecordCandidate(index: number, hasTechnicalError: boolean): void {
    if (index >= this.patientIdentifierCandidates.length) {
      // Cognitive care depends on a medical record, so create the default one
      // on first access instead of leaving the page blocked behind 404s.
      if (!hasTechnicalError) {
        this.ensureOwnRecord();
        return;
      }

      this.isLoading = false;
      this.infoMessage = hasTechnicalError
        ? ''
        : 'No medical record is associated with your account yet.';
      if (hasTechnicalError) {
        this.errorMessage = 'Unable to load your cognitive record.';
      }
      return;
    }

    const candidate = this.patientIdentifierCandidates[index];
    this.medicalRecordService.getByPatientId(candidate).subscribe({
      next: (record) => {
        this.currentRecord = record;
        this.resolvePatientDisplayName(record.patientId);
        this.loadCognitiveData(record.id);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.tryLoadOwnRecordCandidate(index + 1, hasTechnicalError);
          return;
        }

        if (index + 1 < this.patientIdentifierCandidates.length) {
          this.tryLoadOwnRecordCandidate(index + 1, true);
          return;
        }

        this.isLoading = false;
        this.errorMessage = 'Unable to load your cognitive record.';
      }
    });
  }

  private ensureOwnRecord(): void {
    // Reuse the primary stable identifier when creating the linked record.
    const patientId = this.getPrimaryPatientIdentifier();
    if (!patientId) {
      this.isLoading = false;
      this.infoMessage = 'No medical record is associated with your session.';
      return;
    }

    this.medicalRecordService.ensureForPatientId(patientId).subscribe({
      next: (record) => {
        this.currentRecord = record;
        this.resolvePatientDisplayName(record.patientId);
        this.loadCognitiveData(record.id);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load your cognitive record.';
      }
    });
  }

  private getPrimaryPatientIdentifier(): string {
    return this.patientIdentifierCandidates[0]?.trim() ?? '';
  }

  private loadCognitiveData(medicalRecordId: string): void {
    forkJoin({
      progress: this.cognitiveService.getProgress(medicalRecordId),
      games: this.cognitiveService.getRecommendedGames(medicalRecordId),
      sessions: this.cognitiveService.listSessions(medicalRecordId),
    }).subscribe({
      next: ({ progress, games, sessions }) => {
        this.progress = progress;
        this.recommendedGames = games;
        this.sessions = [...sessions].sort(
          (left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime()
        );
        this.selectedGame = games[0] ?? null;
        if (this.selectedGame) {
          this.sessionForm.patchValue({
            cognitiveGameId: this.selectedGame.id,
            difficultyAtPlay: this.selectedGame.difficultyLevel,
          });
        }
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = this.extractError(error, 'Unable to load cognitive stimulation data.');
      }
    });
  }

  private resetSessionForm(): void {
    this.sessionForm.reset({
      cognitiveGameId: this.selectedGame?.id ?? '',
      playerAnswer: '',
      correct: true,
      score: 80,
      difficultyAtPlay: this.selectedGame?.difficultyLevel ?? 1,
      assistanceNeeded: false,
      frustrationLevel: 2,
      enjoymentLevel: 4,
      abandoned: false,
      notes: '',
    });
  }

  private resetViewMessages(): void {
    this.errorMessage = '';
    this.infoMessage = '';
    this.successMessage = '';
  }

  private resolvePatientDisplayName(patientId: string): void {
    this.patientDisplayName = this.fallbackPatientDisplayName(patientId);

    this.assessmentService.getByPatient(patientId).subscribe({
      next: (reports) => {
        const namedReport = reports.find((report) => typeof report.patientName === 'string' && report.patientName.trim().length > 0);
        if (namedReport?.patientName) {
          this.patientDisplayName = namedReport.patientName.trim();
        }
      },
      error: () => {
        this.patientDisplayName = this.fallbackPatientDisplayName(patientId);
      }
    });
  }

  private fallbackPatientDisplayName(patientId: string): string {
    if (this.isOwnPatientIdentifier(patientId) && this.currentUser?.name?.trim()) {
      return this.currentUser.name.trim();
    }
    return patientId;
  }

  private isOwnRecord(record: MedicalRecord): boolean {
    const patientId = record.patientId.trim().toLowerCase();
    return this.patientIdentifierCandidates.some((candidate) => candidate.toLowerCase() === patientId);
  }

  private isOwnPatientIdentifier(patientId: string): boolean {
    const normalizedPatientId = patientId.trim().toLowerCase();
    return this.patientIdentifierCandidates.some((candidate) => candidate.toLowerCase() === normalizedPatientId);
  }

  private resolvePatientIdentifierCandidates(user: User | null): string[] {
    const candidates: string[] = [];
    const storedUser = this.readStoredUser();

    if (typeof window !== 'undefined') {
      const localPatientId = window.localStorage.getItem('patientId');
      if (localPatientId?.trim()) {
        candidates.push(localPatientId.trim());
      }
    }

    const pushUserCandidates = (sourceUser: User | null) => {
      if (!sourceUser) {
        return;
      }

      if (sourceUser.userId?.trim()) {
        candidates.push(sourceUser.userId.trim());
      }

      if (this.currentRole !== 'PATIENT' && sourceUser.email?.trim()) {
        candidates.push(sourceUser.email.trim());
      }

      if (this.currentRole !== 'PATIENT' && sourceUser.name?.trim()) {
        candidates.push(sourceUser.name.trim());
      }
    };

    pushUserCandidates(user);
    pushUserCandidates(storedUser);

    const seen = new Set<string>();
    return candidates.filter((candidate) => {
      const normalized = candidate.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }

  private readStoredUser(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const stored = window.localStorage.getItem('current_user');
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  }

  private readStoredRole(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const localRole = window.localStorage.getItem('role');
    if (localRole?.trim()) {
      return localRole.trim();
    }

    return this.readStoredUser()?.role ?? null;
  }

  private normalizeRole(role?: string | null): UserRole {
    const normalized = role?.trim().toUpperCase();
    if (
      normalized === 'PATIENT' ||
      normalized === 'CAREGIVER' ||
      normalized === 'DOCTOR' ||
      normalized === 'ADMIN'
    ) {
      return normalized;
    }
    return null;
  }

  private extractError(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}
