import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MedicamentAnalyticsSummary, MedicamentUsageStats } from '../../../prescription/models/medicament.model';
import { MedicamentService } from '../../../prescription/services/medicament.service';

@Component({
  selector: 'app-medicaments-analytics',
  templateUrl: './medicaments-analytics.component.html'
})
export class MedicamentsAnalyticsComponent implements OnInit {
  summary: MedicamentAnalyticsSummary | null = null;
  usage: MedicamentUsageStats[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private medicamentService: MedicamentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      summary: this.medicamentService.getAnalyticsSummary(),
      usage: this.medicamentService.getUsageStats(8)
    }).subscribe({
      next: ({ summary, usage }) => {
        this.summary = summary;
        this.usage = usage;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to load medicament analytics.';
        this.loading = false;
      }
    });
  }

  getUsageWidth(count: number): number {
    const max = Math.max(...this.usage.map(item => item.totalPrescriptions), 1);
    return Math.max((count / max) * 100, 8);
  }

  goToCatalog(): void {
    this.router.navigate(['/admin/medicaments']);
  }

  trackByUsage(_: number, item: MedicamentUsageStats): string {
    return item.medicamentId;
  }
}
