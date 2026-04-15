import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { Medicament } from '../../models/medicament.model';
import { MedicamentService } from '../../services/medicament.service';

@Component({
  selector: 'app-medication-selector',
  templateUrl: './medication-selector.component.html'
})
export class MedicationSelectorComponent implements OnInit, OnDestroy {

  @Input() selectedMedicament: Medicament | null = null;
  @Input() placeholder: string = 'Search medication...';
  @Input() disabled: boolean = false;

  @Output() medicamentSelected = new EventEmitter<Medicament>();
  @Output() medicamentCleared = new EventEmitter<void>();

  searchQuery: string = '';
  results: Medicament[] = [];
  isOpen: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private medicamentService: MedicamentService) {}

  ngOnInit(): void {
    // Debounce search — waits 300ms after user stops typing before hitting API
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(keyword => {
        if (!keyword || keyword.trim().length < 2) {
          this.results = [];
          this.loading = false;
          return [];
        }
        this.loading = true;
        return this.medicamentService.searchMedicaments(keyword);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        this.results = results;
        this.loading = false;
        this.isOpen = results.length > 0;
      },
      error: () => {
        this.errorMessage = 'Failed to search medications.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.errorMessage = '';

    if (!value || value.trim().length < 2) {
      this.results = [];
      this.isOpen = false;
      return;
    }

    this.searchSubject.next(value.trim());
  }

  selectMedicament(medicament: Medicament): void {
    this.selectedMedicament = medicament;
    this.searchQuery = medicament.nomCommercial;
    this.isOpen = false;
    this.results = [];
    this.medicamentSelected.emit(medicament);
  }

  clearSelection(): void {
    this.selectedMedicament = null;
    this.searchQuery = '';
    this.results = [];
    this.isOpen = false;
    this.medicamentCleared.emit();
  }

  closeDropdown(): void {
    // Small delay so click on result registers before dropdown closes
    setTimeout(() => {
      this.isOpen = false;
    }, 200);
  }

  getFormeIcon(forme: string | undefined): string {
    switch (forme?.toLowerCase()) {
      case 'comprimé':
      case 'comprimes': return '💊';
      case 'solution buvable':
      case 'sirop': return '🧴';
      case 'patch': return '🩹';
      case 'injection': return '💉';
      case 'gélule': return '🔴';
      default: return '💊';
    }
  }
}
