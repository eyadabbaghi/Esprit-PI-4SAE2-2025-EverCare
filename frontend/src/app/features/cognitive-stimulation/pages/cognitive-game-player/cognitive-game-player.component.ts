import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MedicalRecord } from '../../../medical-record/models/medical-record.model';
import { MedicalRecordService } from '../../../medical-record/services/medical-record.service';
import { CognitiveGame, CreateGameSessionRequest, GameSession } from '../../models/cognitive-stimulation.model';
import { CognitiveStimulationService } from '../../services/cognitive-stimulation.service';
import { CognitiveChallenge, buildCognitiveChallenge } from '../../utils/cognitive-game-challenges';
import { getGameMedia } from '../../utils/cognitive-game-media';

type PlayerPhase = 'preview' | 'question' | 'result';

interface MemoryCard {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
}

@Component({
  selector: 'app-cognitive-game-player',
  templateUrl: './cognitive-game-player.component.html',
  styleUrl: './cognitive-game-player.component.css'
})
export class CognitiveGamePlayerComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly feedbackForm = this.formBuilder.group({
    selectedAnswer: this.formBuilder.control('', Validators.required),
  });

  medicalRecord: MedicalRecord | null = null;
  game: CognitiveGame | null = null;
  challenge: CognitiveChallenge | null = null;
  createdSession: GameSession | null = null;
  memoryCards: MemoryCard[] = [];

  phase: PlayerPhase = 'question';
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  startedAt = 0;
  elapsedSeconds = 0;
  computedScore = 0;
  isCorrect = false;
  hasTimedOut = false;
  timeoutNoticeVisible = false;
  timeLimitSeconds = 0;
  remainingSeconds = 0;
  memoryTurns = 0;
  matchedPairs = 0;
  isResolvingMemoryPair = false;

  private countdownHandle: number | null = null;
  private timeoutNoticeHandle: number | null = null;
  private memoryResetHandle: number | null = null;
  private audioContext: AudioContext | null = null;
  private lastCountdownBeepSecond: number | null = null;
  private openedCardIds: number[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly medicalRecordService: MedicalRecordService,
    private readonly cognitiveService: CognitiveStimulationService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.errorMessage = 'Loading the therapeutic game in the browser...';
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const medicalRecordId = params.get('medicalRecordId');
      const gameId = params.get('gameId');

      if (!medicalRecordId || !gameId) {
        this.errorMessage = 'Game information is incomplete.';
        return;
      }

      this.loadContext(medicalRecordId, gameId);
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.clearTimeoutNotice();
    this.clearMemoryResetHandle();
    this.audioContext?.close();
    this.audioContext = null;
  }

  get canSubmit(): boolean {
    return !!this.challenge && !!this.medicalRecord?.active && !this.isSubmitting && this.phase === 'question';
  }

  get selectedAnswer(): string {
    return this.feedbackForm.controls.selectedAnswer.value;
  }

  get formattedRemainingTime(): string {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  get isTimerCritical(): boolean {
    return this.remainingSeconds > 0 && this.remainingSeconds <= 30;
  }

  get isTimerDanger(): boolean {
    return this.remainingSeconds > 0 && this.remainingSeconds <= 10;
  }

  get showFinalCountdown(): boolean {
    return this.phase === 'question' && this.remainingSeconds > 0 && this.remainingSeconds <= 5;
  }

  get gameVisual(): string {
    return getGameMedia(this.game).imageUrl;
  }

  get gameThemeClass(): string {
    return getGameMedia(this.game).themeClass;
  }

  get gameHelperText(): string {
    return getGameMedia(this.game).helperText;
  }

  get supportTitle(): string {
    return getGameMedia(this.game).supportTitle;
  }

  get isInteractiveMemoryGame(): boolean {
    return this.game?.gameType === 'MEMORY' && !!this.challenge?.memoryDeck?.length;
  }

  get totalMemoryPairs(): number {
    return this.challenge?.memoryDeck?.length ?? 0;
  }

  startChallenge(): void {
    this.phase = 'question';
    this.startTimer();
  }

  submitGame(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    this.completeSession(false);
  }

  replay(): void {
    if (!this.game) {
      return;
    }

    this.stopTimer();
    this.clearTimeoutNotice();
    this.clearMemoryResetHandle();
    this.challenge = buildCognitiveChallenge(this.game);
    this.initializeChallengeState();
  }

  flipMemoryCard(card: MemoryCard): void {
    if (!this.isInteractiveMemoryGame || this.phase !== 'question' || this.isSubmitting) {
      return;
    }

    if (this.isResolvingMemoryPair || card.flipped || card.matched) {
      return;
    }

    card.flipped = true;
    this.openedCardIds.push(card.id);

    if (this.openedCardIds.length < 2) {
      return;
    }

    this.memoryTurns += 1;

    const [firstId, secondId] = this.openedCardIds;
    const firstCard = this.memoryCards.find((item) => item.id === firstId);
    const secondCard = this.memoryCards.find((item) => item.id === secondId);

    if (!firstCard || !secondCard) {
      this.openedCardIds = [];
      return;
    }

    if (firstCard.value === secondCard.value) {
      firstCard.matched = true;
      secondCard.matched = true;
      this.openedCardIds = [];
      this.matchedPairs += 1;

      if (this.matchedPairs === this.totalMemoryPairs) {
        this.clearMemoryResetHandle();
        this.memoryResetHandle = window.setTimeout(() => {
          this.completeSession(false);
        }, 450);
      }
      return;
    }

    this.isResolvingMemoryPair = true;
    this.clearMemoryResetHandle();
    this.memoryResetHandle = window.setTimeout(() => {
      firstCard.flipped = false;
      secondCard.flipped = false;
      this.openedCardIds = [];
      this.isResolvingMemoryPair = false;
      this.memoryResetHandle = null;
    }, 850);
  }

  private loadContext(medicalRecordId: string, gameId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.stopTimer();
    this.clearTimeoutNotice();
    this.clearMemoryResetHandle();

    forkJoin({
      record: this.medicalRecordService.getById(medicalRecordId),
      game: this.cognitiveService.getGame(gameId),
    }).subscribe({
      next: ({ record, game }) => {
        this.medicalRecord = record;
        this.game = game;
        this.challenge = buildCognitiveChallenge(game);
        this.initializeChallengeState();
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Unable to load the therapeutic game.');
        this.isLoading = false;
      }
    });
  }

  private initializeChallengeState(): void {
    this.phase = this.challenge?.memoryPreview?.length ? 'preview' : 'question';
    this.feedbackForm.reset({ selectedAnswer: '' });
    this.createdSession = null;
    this.hasTimedOut = false;
    this.timeoutNoticeVisible = false;
    this.computedScore = 0;
    this.elapsedSeconds = 0;
    this.isCorrect = false;
    this.memoryTurns = 0;
    this.matchedPairs = 0;
    this.isResolvingMemoryPair = false;
    this.openedCardIds = [];
    this.setupMemoryBoard();
    this.setTimeLimit();

    if (this.phase === 'question') {
      this.startTimer();
    }
  }

  private setupMemoryBoard(): void {
    const deck = this.challenge?.memoryDeck ?? [];
    if (!deck.length || this.game?.gameType !== 'MEMORY') {
      this.memoryCards = [];
      return;
    }

    const duplicatedDeck = [...deck, ...deck];
    this.memoryCards = shuffleArray(duplicatedDeck).map((value, index) => ({
      id: index + 1,
      value,
      flipped: false,
      matched: false,
    }));
  }

  private setTimeLimit(): void {
    this.timeLimitSeconds = Math.max(60, (this.game?.estimatedDuration ?? 5) * 60);
    this.remainingSeconds = this.timeLimitSeconds;
    this.lastCountdownBeepSecond = null;
  }

  private startTimer(): void {
    this.stopTimer();
    this.clearTimeoutNotice();
    this.hasTimedOut = false;
    this.lastCountdownBeepSecond = null;
    this.startedAt = Date.now();
    this.remainingSeconds = this.timeLimitSeconds;
    this.ensureAudioContext();

    this.countdownHandle = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startedAt) / 1000);
      this.remainingSeconds = Math.max(0, this.timeLimitSeconds - elapsed);

      if (this.showFinalCountdown && this.lastCountdownBeepSecond !== this.remainingSeconds) {
        this.playCountdownBeep(this.remainingSeconds);
        this.lastCountdownBeepSecond = this.remainingSeconds;
      }

      if (this.remainingSeconds <= 0) {
        this.playTimeoutBeep();
        this.stopTimer();
        this.handleTimeExpired();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.countdownHandle !== null) {
      window.clearInterval(this.countdownHandle);
      this.countdownHandle = null;
    }
  }

  private showTimeoutNotice(): void {
    this.timeoutNoticeVisible = true;
    this.clearTimeoutNotice();
    this.timeoutNoticeHandle = window.setTimeout(() => {
      this.timeoutNoticeVisible = false;
      this.timeoutNoticeHandle = null;
    }, 2200);
  }

  private clearTimeoutNotice(): void {
    if (this.timeoutNoticeHandle !== null) {
      window.clearTimeout(this.timeoutNoticeHandle);
      this.timeoutNoticeHandle = null;
    }
  }

  private clearMemoryResetHandle(): void {
    if (this.memoryResetHandle !== null) {
      window.clearTimeout(this.memoryResetHandle);
      this.memoryResetHandle = null;
    }
  }

  private ensureAudioContext(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContextCtor();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => undefined);
    }
  }

  private playCountdownBeep(second: number): void {
    const frequency = second === 1 ? 920 : 720;
    this.playBeep(frequency, 0.08, 0.025);
  }

  private playTimeoutBeep(): void {
    this.playBeep(420, 0.22, 0.05);
  }

  private playBeep(frequency: number, durationSeconds: number, volume: number): void {
    if (!this.audioContext || this.audioContext.state !== 'running') {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + durationSeconds);
  }

  private handleTimeExpired(): void {
    if (this.phase !== 'question' || this.isSubmitting) {
      return;
    }

    this.hasTimedOut = true;
    this.showTimeoutNotice();
    this.completeSession(true);
  }

  private completeSession(abandoned: boolean): void {
    if (!this.medicalRecord || !this.game || !this.challenge || !this.canCompleteSession(abandoned)) {
      return;
    }

    this.stopTimer();
    this.clearMemoryResetHandle();
    this.elapsedSeconds = abandoned
      ? this.timeLimitSeconds
      : Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));

    const answerSummary = this.buildAnswerSummary(abandoned);
    this.isCorrect = !abandoned && this.resolveCorrectness();
    this.computedScore = this.resolveScore(abandoned);

    const payload: CreateGameSessionRequest = {
      cognitiveGameId: this.game.id,
      playerAnswer: answerSummary,
      correct: this.isCorrect,
      score: this.computedScore,
      difficultyAtPlay: this.game.difficultyLevel,
      assistanceNeeded: false,
      frustrationLevel: 2,
      enjoymentLevel: 4,
      abandoned,
      notes: this.resolveSessionNotes(abandoned),
    };

    this.persistSession(payload, abandoned);
  }

  private persistSession(payload: CreateGameSessionRequest, abandoned: boolean): void {
    if (!this.medicalRecord) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cognitiveService.createSession(this.medicalRecord.id, payload).subscribe({
      next: (session) => {
        this.createdSession = session;
        this.phase = 'result';
        this.successMessage = abandoned
          ? 'Time is up. The session was saved as incomplete.'
          : 'The game result was saved in the cognitive record.';
        this.isSubmitting = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(
          error,
          abandoned ? 'Unable to save the session after time expired.' : 'Unable to save the game result.'
        );
        this.isSubmitting = false;
      }
    });
  }

  private resolveCorrectness(): boolean {
    if (this.isInteractiveMemoryGame) {
      return this.matchedPairs === this.totalMemoryPairs;
    }

    const rawValue = this.feedbackForm.getRawValue();
    const answer = rawValue.selectedAnswer?.trim() ?? '';
    return normalizeValue(answer) === normalizeValue(this.challenge?.correctAnswer ?? '');
  }

  private resolveScore(abandoned: boolean): number {
    if (this.isInteractiveMemoryGame) {
      if (abandoned) {
        const progressRatio = this.totalMemoryPairs > 0 ? this.matchedPairs / this.totalMemoryPairs : 0;
        return Math.round(progressRatio * 60);
      }
      return this.calculateMemoryScore();
    }

    if (!this.isCorrect) {
      return abandoned ? 0 : 25;
    }

    const timeTarget = Math.max(60, (this.game?.estimatedDuration ?? 5) * 60);
    const timeRatio = Math.max(0, 1 - this.elapsedSeconds / timeTarget);
    const score = 65 + Math.round(timeRatio * 20) + (this.game?.difficultyLevel ?? 1) * 3;
    return Math.max(0, Math.min(100, score));
  }

  private calculateMemoryScore(): number {
    const timeTarget = Math.max(60, (this.game?.estimatedDuration ?? 5) * 60);
    const timeRatio = Math.max(0, 1 - this.elapsedSeconds / timeTarget);
    const idealTurns = Math.max(this.totalMemoryPairs, 1);
    const efficiencyRatio = Math.max(0, Math.min(1, idealTurns / Math.max(this.memoryTurns, idealTurns)));
    const score = 50 + Math.round(timeRatio * 20) + Math.round(efficiencyRatio * 30);
    return Math.max(0, Math.min(100, score));
  }

  private buildAnswerSummary(abandoned: boolean): string | null {
    if (this.isInteractiveMemoryGame) {
      return `Matched ${this.matchedPairs}/${this.totalMemoryPairs} pairs in ${this.memoryTurns} turns`;
    }

    const rawValue = this.feedbackForm.getRawValue();
    const answer = rawValue.selectedAnswer?.trim() ?? '';
    if (abandoned && !answer) {
      return null;
    }
    return answer || null;
  }

  private resolveSessionNotes(abandoned: boolean): string | null {
    if (this.isInteractiveMemoryGame) {
      if (abandoned) {
        return `Session ended automatically: time expired after ${this.matchedPairs}/${this.totalMemoryPairs} pairs.`;
      }
      return `Memory game completed in ${this.memoryTurns} turns.`;
    }

    return abandoned ? 'Session ended automatically: time expired.' : null;
  }

  private canCompleteSession(abandoned: boolean): boolean {
    if (!this.medicalRecord?.active || !this.challenge || !this.game || this.isSubmitting || this.phase !== 'question') {
      return false;
    }

    if (abandoned) {
      return true;
    }

    if (this.isInteractiveMemoryGame) {
      return this.matchedPairs === this.totalMemoryPairs && this.totalMemoryPairs > 0;
    }

    return this.feedbackForm.valid;
  }

  private extractError(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}

function normalizeValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function shuffleArray(values: string[]): string[] {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}
