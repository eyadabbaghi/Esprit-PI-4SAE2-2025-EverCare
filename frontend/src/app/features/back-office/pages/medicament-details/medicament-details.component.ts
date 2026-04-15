import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Medicament, MedicamentUsageStats } from '../../../prescription/models/medicament.model';
import { MedicamentService } from '../../../prescription/services/medicament.service';

@Component({
  selector: 'app-medicament-details',
  templateUrl: './medicament-details.component.html'
})
export class MedicamentDetailsComponent implements OnInit {
  medicament: Medicament | null = null;
  usage: MedicamentUsageStats | null = null;
  loading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private medicamentService: MedicamentService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Missing medicament id.';
      return;
    }

    this.loadMedicament(id);
  }

  goBack(): void {
    this.router.navigate(['/admin/medicaments']);
  }

  goToEdit(): void {
    if (!this.medicament) {
      return;
    }

    this.router.navigate(['/admin/medicaments', this.medicament.medicamentId, 'edit']);
  }

  private loadMedicament(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      medicament: this.medicamentService.getMedicamentById(id),
      usage: this.medicamentService.getUsageStats(200)
    }).subscribe({
      next: ({ medicament, usage }) => {
        this.medicament = medicament;
        this.usage = usage.find(item => item.medicamentId === id) || null;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to load medicament details.';
        this.loading = false;
      }
    });
  }
}
