import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Medicament } from '../../models/medicament.model';
import { PrescriptionRequest } from '../../models/prescription.model';

@Component({
  selector: 'app-prescription-form',
  templateUrl: './prescription-form.component.html'
})
export class PrescriptionFormComponent implements OnInit {

  @Input() patientId!: string;
  @Input() doctorId!: string;
  @Input() appointmentId?: string;

  @Output() onSubmit = new EventEmitter<PrescriptionRequest>();
  @Output() onClose = new EventEmitter<void>();

  selectedMedicament: Medicament | null = null;
  loading: boolean = false;
  errorMessage: string = '';

  form: PrescriptionRequest = {
    patientId: '',
    doctorId: '',
    medicamentId: '',
    appointmentId: '',
    dateDebut: '',
    dateFin: '',
    posologie: '',
    instructions: '',
    renouvelable: false,
    nombreRenouvellements: 0,
    priseMatin: '',
    priseMidi: '',
    priseSoir: '',
    resumeSimple: '',
    notesMedecin: ''
  };

  // Duration presets for quick selection
  durationPresets = [
    { label: '7 days',   days: 7  },
    { label: '15 days',  days: 15 },
    { label: '30 days',  days: 30 },
    { label: '60 days',  days: 60 },
    { label: '90 days',  days: 90 },
  ];

  showAlzheimerFields: boolean = false;
  showDoctorNotes: boolean = false;

  ngOnInit(): void {
    this.form.patientId = this.patientId;
    this.form.doctorId = this.doctorId;
    this.form.appointmentId = this.appointmentId || '';

    // Default start date to today
    const today = new Date();
    this.form.dateDebut = this.formatDate(today);
  }

  onMedicamentSelected(medicament: Medicament): void {
    this.selectedMedicament = medicament;
    this.form.medicamentId = medicament.medicamentId;
    this.errorMessage = '';

    // Auto-fill simplified notice if available
    if (medicament.noticeSimplifiee) {
      this.form.resumeSimple = medicament.noticeSimplifiee;
    }
  }

  onMedicamentCleared(): void {
    this.selectedMedicament = null;
    this.form.medicamentId = '';
  }

  applyDurationPreset(days: number): void {
    const start = this.form.dateDebut ? new Date(this.form.dateDebut) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    this.form.dateFin = this.formatDate(end);
  }

  onRenouvelableChange(checked: boolean): void {
    this.form.renouvelable = checked;
    if (!checked) {
      this.form.nombreRenouvellements = 0;
    }
  }

  isFormValid(): boolean {
    return !!(
      this.form.patientId &&
      this.form.doctorId &&
      this.form.medicamentId &&
      this.form.dateDebut &&
      this.form.dateFin &&
      this.form.posologie &&
      new Date(this.form.dateFin) > new Date(this.form.dateDebut)
    );
  }

  submit(): void {
    if (!this.isFormValid()) {
      this.errorMessage = 'Please fill in all required fields and ensure the end date is after the start date.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.onSubmit.emit(this.form);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
