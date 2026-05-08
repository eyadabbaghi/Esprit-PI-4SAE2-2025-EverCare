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
      case 'comprimes': return '<svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m10.5 20.5-7-7a3.5 3.5 0 0 1 5-5l7 7a3.5 3.5 0 0 1-5 5Z" stroke-width="2"></path><path d="m8.5 8.5 7 7" stroke-width="2"></path></svg>';
      case 'solution buvable':
      case 'sirop': return '<svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M9 3h6v3l2 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3V3Z" stroke-width="2" stroke-linejoin="round"></path></svg>';
      case 'patch': return '<svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><rect x="4" y="8" width="16" height="8" rx="4" stroke-width="2"></rect><path d="M12 8v8M8 12h8" stroke-width="2"></path></svg>';
      case 'injection': return '<svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 20 6-6M14 4l6 6M8 16 18 6M12 4l8 8" stroke-width="2" stroke-linecap="round"></path></svg>';
      case 'gélule': return '<svg class="inline-svg-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="7"></circle></svg>';
      default: return '<svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m10.5 20.5-7-7a3.5 3.5 0 0 1 5-5l7 7a3.5 3.5 0 0 1-5 5Z" stroke-width="2"></path><path d="m8.5 8.5 7 7" stroke-width="2"></path></svg>';
    }
  }
}
