import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ClinicalMeasurementService } from '../../services/clinical-measurement.service';
import { ClinicalMeasurementRequest } from '../../models/clinical-measurement.model';

@Component({
  selector: 'app-clinical-measurement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clinical-measurement-modal.component.html'
})
export class ClinicalMeasurementModalComponent implements OnInit {
  @Input() patientId: string = '';
  @Input() appointmentId: string = '';
  @Input() patientName: string = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<void>();

  form!: FormGroup;
  loading = false;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private clinicalMeasurementService: ClinicalMeasurementService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      weight: ['', [Validators.required, Validators.min(20), Validators.max(300)]],
      kidneyTestResult: [''],
      severeLiverProblem: [false],
      currentMedications: [''],
      allergies: ['']
    });
  }

  close(): void {
    this.onClose.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formData = this.form.value;

    const request: ClinicalMeasurementRequest = {
      patientId: this.patientId,
      appointmentId: this.appointmentId || undefined,
      weight: formData.weight,
      kidneyTestResult: formData.kidneyTestResult || 'none',
      severeLiverProblem: formData.severeLiverProblem,
      currentMedications: formData.currentMedications || undefined,
      allergies: formData.allergies || undefined
    };

    this.clinicalMeasurementService.submitMeasurement(request, '').subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
        this.toastr.success('Clinical measurements submitted successfully!');
        this.onSubmit.emit();
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error(err?.error?.message || 'Failed to submit measurements');
      }
    });
  }

  get weight() { return this.form.get('weight'); }
  get kidneyTestResult() { return this.form.get('kidneyTestResult'); }
  get severeLiverProblem() { return this.form.get('severeLiverProblem'); }
  get currentMedications() { return this.form.get('currentMedications'); }
  get allergies() { return this.form.get('allergies'); }
}