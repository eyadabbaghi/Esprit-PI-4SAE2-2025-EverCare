import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MedicamentRequest } from '../../../prescription/models/medicament.model';
import { MedicamentService } from '../../../prescription/services/medicament.service';

@Component({
  selector: 'app-medicament-editor-placeholder',
  templateUrl: './medicament-editor-placeholder.component.html'
})
export class MedicamentEditorPlaceholderComponent implements OnInit {
  mode: 'create' | 'edit' = 'create';
  medicamentId: string | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  medicamentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private medicamentService: MedicamentService,
    private toastr: ToastrService
  ) {
    this.medicamentForm = this.fb.group({
      nomCommercial: ['', [Validators.required, Validators.minLength(2)]],
      denominationCommuneInternationale: ['', [Validators.required, Validators.minLength(2)]],
      codeCIP: [''],
      dosage: [''],
      forme: [''],
      laboratoire: [''],
      indications: ['', [Validators.maxLength(500)]],
      contreIndications: ['', [Validators.maxLength(500)]],
      effetsSecondaires: ['', [Validators.maxLength(1000)]],
      noticeSimplifiee: ['', [Validators.maxLength(500)]],
      photoUrl: ['']
    });
  }

  ngOnInit(): void {
    this.medicamentId = this.route.snapshot.paramMap.get('id');
    this.mode = this.medicamentId ? 'edit' : 'create';

    if (this.medicamentId) {
      this.loadMedicament(this.medicamentId);
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/medicaments']);
  }

  save(): void {
    if (this.medicamentForm.invalid) {
      this.medicamentForm.markAllAsTouched();
      return;
    }

    const request: MedicamentRequest = {
      nomCommercial: this.formValue('nomCommercial'),
      denominationCommuneInternationale: this.formValue('denominationCommuneInternationale'),
      codeCIP: this.optionalValue('codeCIP'),
      dosage: this.optionalValue('dosage'),
      forme: this.optionalValue('forme'),
      laboratoire: this.optionalValue('laboratoire'),
      indications: this.optionalValue('indications'),
      contreIndications: this.optionalValue('contreIndications'),
      effetsSecondaires: this.optionalValue('effetsSecondaires'),
      noticeSimplifiee: this.optionalValue('noticeSimplifiee'),
      photoUrl: this.optionalValue('photoUrl')
    };

    this.saving = true;
    this.errorMessage = '';

    const request$ = this.mode === 'edit' && this.medicamentId
      ? this.medicamentService.updateMedicament(this.medicamentId, request)
      : this.medicamentService.createMedicament(request);

    request$.subscribe({
      next: (medicament) => {
        this.saving = false;
        this.toastr.success(`Medicament ${this.mode === 'edit' ? 'updated' : 'created'} successfully.`);
        this.router.navigate(['/admin/medicaments', medicament.medicamentId, 'edit']);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || `Failed to ${this.mode} medicament.`;
      }
    });
  }

  private loadMedicament(id: string): void {
    this.loading = true;
    this.errorMessage = '';

    this.medicamentService.getMedicamentById(id).subscribe({
      next: medicament => {
        this.medicamentForm.patchValue({
          nomCommercial: medicament.nomCommercial,
          denominationCommuneInternationale: medicament.denominationCommuneInternationale,
          codeCIP: medicament.codeCIP || '',
          dosage: medicament.dosage || '',
          forme: medicament.forme || '',
          laboratoire: medicament.laboratoire || '',
          indications: medicament.indications || '',
          contreIndications: medicament.contreIndications || '',
          effetsSecondaires: medicament.effetsSecondaires || '',
          noticeSimplifiee: medicament.noticeSimplifiee || '',
          photoUrl: medicament.photoUrl || ''
        });
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Failed to load medicament.';
      }
    });
  }

  private formValue(key: string): string {
    return String(this.medicamentForm.get(key)?.value ?? '').trim();
  }

  private optionalValue(key: string): string | undefined {
    const value = this.formValue(key);
    return value ? value : undefined;
  }
}
