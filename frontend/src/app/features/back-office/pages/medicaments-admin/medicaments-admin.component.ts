import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Medicament, MedicamentFilterParams, MedicamentUsageStats } from '../../../prescription/models/medicament.model';
import { MedicamentService } from '../../../prescription/services/medicament.service';
import { PageResponse } from '../../../prescription/models/page.model';

@Component({
  selector: 'app-medicaments-admin',
  templateUrl: './medicaments-admin.component.html',
  styleUrls: ['./medicaments-admin.component.css']
})
export class MedicamentsAdminComponent implements OnInit {
  medicaments: Medicament[] = [];
  usageStats = new Map<string, MedicamentUsageStats>();

  loading = false;
  errorMessage = '';

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  filters: MedicamentFilterParams = {
    keyword: '',
    actif: undefined,
    laboratoire: '',
    forme: '',
    dosage: '',
    used: undefined,
    sort: 'nomCommercial,asc',
    page: 0,
    size: 10
  };

  constructor(
    private medicamentService: MedicamentService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadMedicaments();
  }

  loadMedicaments(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      page: this.medicamentService.filterMedicaments({
        ...this.filters,
        page: this.page,
        size: this.size
      }),
      usage: this.medicamentService.getUsageStats(200)
    }).subscribe({
      next: ({ page, usage }) => {
        this.applyPage(page);
        this.usageStats = new Map(usage.map(item => [item.medicamentId, item]));
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to load medicaments.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.page = 0;
    this.loadMedicaments();
  }

  resetFilters(): void {
    this.filters = {
      keyword: '',
      actif: undefined,
      laboratoire: '',
      forme: '',
      dosage: '',
      used: undefined,
      sort: 'nomCommercial,asc',
      page: 0,
      size: 10
    };
    this.page = 0;
    this.loadMedicaments();
  }

  goToCreate(): void {
    this.router.navigate(['/admin/medicaments/new']);
  }

  goToEdit(medicament: Medicament): void {
    this.router.navigate(['/admin/medicaments', medicament.medicamentId, 'edit']);
  }

  goToDetails(medicament: Medicament): void {
    this.router.navigate(['/admin/medicaments', medicament.medicamentId]);
  }

  toggleStatus(medicament: Medicament): void {
    const request$ = medicament.actif
      ? this.medicamentService.deactivateMedicament(medicament.medicamentId)
      : this.medicamentService.activateMedicament(medicament.medicamentId);

    request$.subscribe({
      next: () => {
        this.toastr.success(`Medicament ${medicament.actif ? 'deactivated' : 'activated'}.`);
        this.loadMedicaments();
      },
      error: (error) => this.toastr.error(error?.error?.message || 'Failed to update medicament status.')
    });
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) {
      return;
    }
    this.page += 1;
    this.loadMedicaments();
  }

  previousPage(): void {
    if (this.page === 0) {
      return;
    }
    this.page -= 1;
    this.loadMedicaments();
  }

  getUsage(medicamentId: string): MedicamentUsageStats | undefined {
    return this.usageStats.get(medicamentId);
  }

  trackByMedicament(_: number, medicament: Medicament): string {
    return medicament.medicamentId;
  }

  private applyPage(page: PageResponse<Medicament>): void {
    this.medicaments = page.content;
    this.totalElements = page.totalElements;
    this.totalPages = page.totalPages;
    this.page = page.number;
  }
}
