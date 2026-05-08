import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { AuthService, User } from '../../../front-office/pages/login/auth.service';
import { MedicalRecordService } from '../../../medical-record/services/medical-record.service';
import {
  CognitiveGame,
  CognitiveGameRequest,
  CognitiveGameType,
} from '../../models/cognitive-stimulation.model';
import { CognitiveStimulationService } from '../../services/cognitive-stimulation.service';
import { getGameMedia } from '../../utils/cognitive-game-media';

type GameActiveFilter = 'all' | 'active' | 'inactive';
type UserRole = 'PATIENT' | 'CAREGIVER' | 'DOCTOR' | 'ADMIN' | null;

@Component({
  selector: 'app-cognitive-games-catalog',
  templateUrl: './cognitive-games-catalog.component.html',
  styleUrl: './cognitive-games-catalog.component.css'
})
export class CognitiveGamesCatalogComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly gameTypeOptions: Array<{ value: CognitiveGameType; label: string }> = [
    { value: 'MEMORY', label: 'Memory' },
    { value: 'LANGUAGE', label: 'Language' },
    { value: 'LOGIC', label: 'Logic' },
    { value: 'ATTENTION', label: 'Attention' },
    { value: 'PRAXIS', label: 'Praxis' },
    { value: 'GNOSIS', label: 'Recognition' },
  ];

  readonly gameForm = this.formBuilder.group({
    title: this.formBuilder.control('', [Validators.required, Validators.maxLength(255)]),
    description: this.formBuilder.control('', [Validators.required, Validators.maxLength(2000)]),
    gameType: this.formBuilder.control<CognitiveGameType>('MEMORY', Validators.required),
    difficultyLevel: this.formBuilder.control(1, [Validators.required, Validators.min(1), Validators.max(5)]),
    estimatedDuration: this.formBuilder.control(5, [Validators.required, Validators.min(1), Validators.max(60)]),
    instructions: this.formBuilder.control('', [Validators.required, Validators.maxLength(4000)]),
    active: this.formBuilder.control(true),
  });

  games: CognitiveGame[] = [];
  filteredGames: CognitiveGame[] = [];
  currentUser: User | null = null;
  currentRole: UserRole = null;
  currentMedicalRecordId: string | null = null;
  currentPatientIdentifier = '';

  searchTerm = '';
  selectedType: CognitiveGameType | 'ALL' = 'ALL';
  selectedDifficulty: number | 'ALL' = 'ALL';
  selectedActive: GameActiveFilter = 'all';

  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  editingGameId: string | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly cognitiveService: CognitiveStimulationService,
    private readonly medicalRecordService: MedicalRecordService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.errorMessage = 'Loading the catalog in the browser...';
      return;
    }

    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.currentRole = this.normalizeRole(user?.role);
      this.resolveMedicalRecordContext(user);
    });

    this.loadGames();
  }

  get canManageGames(): boolean {
    return this.currentRole === 'DOCTOR' || this.currentRole === 'ADMIN';
  }

  get canLaunchGames(): boolean {
    return (this.currentRole === 'PATIENT' || this.currentRole === 'CAREGIVER') && !!this.currentMedicalRecordId;
  }

  get activeGamesCount(): number {
    return this.games.filter((game) => game.active).length;
  }

  get averageDuration(): number {
    if (!this.games.length) {
      return 0;
    }

    const total = this.games.reduce((sum, game) => sum + game.estimatedDuration, 0);
    return Math.round(total / this.games.length);
  }

  loadGames(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cognitiveService.listGames().subscribe({
      next: (games) => {
        this.games = [...games].sort((a, b) => a.title.localeCompare(b.title));
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Unable to load the game catalog.');
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredGames = this.games.filter((game) => {
      const matchesSearch =
        !search ||
        game.title.toLowerCase().includes(search) ||
        game.description.toLowerCase().includes(search) ||
        game.instructions.toLowerCase().includes(search);

      const matchesType = this.selectedType === 'ALL' || game.gameType === this.selectedType;
      const matchesDifficulty =
        this.selectedDifficulty === 'ALL' || game.difficultyLevel === this.selectedDifficulty;
      const matchesActive =
        this.selectedActive === 'all' ||
        (this.selectedActive === 'active' && game.active) ||
        (this.selectedActive === 'inactive' && !game.active);

      return matchesSearch && matchesType && matchesDifficulty && matchesActive;
    });
  }

  submitGame(): void {
    if (!this.canManageGames || this.gameForm.invalid || this.isSubmitting) {
      this.gameForm.markAllAsTouched();
      return;
    }

    const rawValue = this.gameForm.getRawValue();
    const payload: CognitiveGameRequest = {
      title: rawValue.title.trim(),
      description: rawValue.description.trim(),
      gameType: rawValue.gameType,
      difficultyLevel: rawValue.difficultyLevel,
      estimatedDuration: rawValue.estimatedDuration,
      instructions: rawValue.instructions.trim(),
      active: rawValue.active,
    };

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.editingGameId
      ? this.cognitiveService.updateGame(this.editingGameId, payload)
      : this.cognitiveService.createGame(payload);

    request$.subscribe({
      next: () => {
        this.successMessage = this.editingGameId
          ? 'The therapeutic game was updated.'
          : 'The therapeutic game was created.';
        this.isSubmitting = false;
        this.resetEditor();
        this.loadGames();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Unable to save the therapeutic game.');
        this.isSubmitting = false;
      }
    });
  }

  startEdit(game: CognitiveGame): void {
    if (!this.canManageGames) {
      return;
    }

    this.editingGameId = game.id;
    this.successMessage = '';
    this.errorMessage = '';
    this.gameForm.patchValue({
      title: game.title,
      description: game.description,
      gameType: game.gameType,
      difficultyLevel: game.difficultyLevel,
      estimatedDuration: game.estimatedDuration,
      instructions: game.instructions,
      active: game.active,
    });
  }

  deleteGame(game: CognitiveGame): void {
    if (!this.canManageGames || !window.confirm(`Delete the game "${game.title}" ?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.cognitiveService.deleteGame(game.id).subscribe({
      next: () => {
        this.successMessage = 'The therapeutic game was deleted.';
        if (this.editingGameId === game.id) {
          this.resetEditor();
        }
        this.loadGames();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractError(error, 'Unable to delete this game.');
      }
    });
  }

  resetEditor(): void {
    this.editingGameId = null;
    this.gameForm.reset({
      title: '',
      description: '',
      gameType: 'MEMORY',
      difficultyLevel: 1,
      estimatedDuration: 5,
      instructions: '',
      active: true,
    });
  }

  labelForType(type: CognitiveGameType): string {
    return this.gameTypeOptions.find((item) => item.value === type)?.label ?? type;
  }

  imageForGame(game: CognitiveGame): string {
    return getGameMedia(game).imageUrl;
  }

  themeClassForGame(game: CognitiveGame): string {
    return getGameMedia(game).themeClass;
  }

  spotlightLabelForGame(game: CognitiveGame): string {
    return getGameMedia(game).spotlightLabel;
  }

  helperTextForGame(game: CognitiveGame): string {
    return getGameMedia(game).helperText;
  }

  buildPlayLink(game: CognitiveGame): string[] {
    if (!this.currentMedicalRecordId) {
      return ['/cognitive-stimulation'];
    }

    return ['/cognitive-stimulation/medical-record', this.currentMedicalRecordId, 'play', game.id];
  }

  private resolveMedicalRecordContext(user: User | null): void {
    this.currentMedicalRecordId = null;
    this.currentPatientIdentifier = '';

    if (this.currentRole !== 'PATIENT' && this.currentRole !== 'CAREGIVER') {
      return;
    }

    const candidates = this.resolvePatientIdentifierCandidates(user);
    this.tryResolveMedicalRecordCandidate(candidates, 0);
  }

  private tryResolveMedicalRecordCandidate(candidates: string[], index: number): void {
    if (index >= candidates.length) {
      return;
    }

    const candidate = candidates[index];
    this.medicalRecordService.getByPatientId(candidate).subscribe({
      next: (record) => {
        this.currentMedicalRecordId = record.id;
        this.currentPatientIdentifier = candidate;
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.tryResolveMedicalRecordCandidate(candidates, index + 1);
        }
      }
    });
  }

  private resolvePatientIdentifierCandidates(user: User | null): string[] {
    const candidates: string[] = [];

    if (typeof window !== 'undefined') {
      const localPatientId = window.localStorage.getItem('patientId');
      if (localPatientId?.trim()) {
        candidates.push(localPatientId.trim());
      }
    }

    if (user?.userId?.trim()) {
      candidates.push(user.userId.trim());
    }
    if (user?.email?.trim()) {
      candidates.push(user.email.trim());
    }
    if (user?.name?.trim()) {
      candidates.push(user.name.trim());
    }

    const seen = new Set<string>();
    return candidates.filter((value) => {
      const normalized = value.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
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
