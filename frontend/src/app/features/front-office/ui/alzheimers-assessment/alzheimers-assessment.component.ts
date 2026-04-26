import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../pages/login/auth.service';

export interface AssessmentResult {
  userId: string;
  completedAt: string;
  cluster: { id: number; label: string; diagnosisRateInCluster: number };
  diagnosis: { predicted: number; probability: number; label: string };
  severity?: {
    mmseEstimate: number;
    stage: string;
    severityLevel: string;
    mmseRange: string;
  };
  riskAssessment?: {
    score: number;
    level: string;
    riskFactors: string[];
  };
  recommendations: {
    path: string;
    title: string;
    description?: string;
    medications?: string[];
    lifestyle?: string[];
    monitoring?: string[];
    support?: string[];
    actions?: string[];
  };
}

@Component({
  selector: 'app-alzheimers-assessment',
  templateUrl: './alzheimers-assessment.component.html',
  styleUrls: ['./alzheimers-assessment.component.css'],
})
export class AlzheimersAssessmentComponent implements OnInit {
  @Output() completed = new EventEmitter<AssessmentResult>();
  @Output() skipped = new EventEmitter<void>();

  currentStep = 0;
  isLoading = false;
  assessmentResult: AssessmentResult | null = null;

  form: FormGroup;

  private apiUrl = 'http://localhost:8089/EverCare/assessment/predict';

  readonly steps = [
    { title: 'Personal Info', icon: '👤', fields: ['age', 'gender', 'bmi'] },
    { title: 'Lifestyle', icon: '🏃', fields: ['smoking', 'alcoholConsumption', 'physicalActivity', 'dietQuality', 'sleepQuality'] },
    { title: 'Medical History', icon: '🏥', fields: ['familyHistoryAlzheimers', 'cardiovascularDisease', 'diabetes', 'depression', 'headInjury', 'hypertension'] },
    { title: 'Cognitive Assessment', icon: '🧠', fields: ['functionalAssessment', 'memoryComplaints', 'behavioralProblems', 'adl'] },
    { title: 'Symptom Check', icon: '📋', fields: ['confusion', 'disorientation', 'personalityChanges', 'difficultyCompletingTasks', 'forgetfulness'] },
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      // Step 1: Personal info
      age: [65, [Validators.required, Validators.min(18), Validators.max(110)]],
      gender: [0, Validators.required],
      bmi: [25.0, [Validators.required, Validators.min(10), Validators.max(60)]],

      // Step 2: Lifestyle
      smoking: [0],
      alcoholConsumption: [5, [Validators.min(0), Validators.max(20)]],
      physicalActivity: [5, [Validators.min(0), Validators.max(10)]],
      dietQuality: [5, [Validators.min(0), Validators.max(10)]],
      sleepQuality: [7, [Validators.min(0), Validators.max(10)]],

      // Step 3: Medical history
      familyHistoryAlzheimers: [0],
      cardiovascularDisease: [0],
      diabetes: [0],
      depression: [0],
      headInjury: [0],
      hypertension: [0],

      // Step 4: Cognitive assessment
      functionalAssessment: [8, [Validators.min(0), Validators.max(10)]],
      memoryComplaints: [0],
      behavioralProblems: [0],
      adl: [8, [Validators.min(0), Validators.max(10)]],

      // Step 5: Symptoms
      confusion: [0],
      disorientation: [0],
      personalityChanges: [0],
      difficultyCompletingTasks: [0],
      forgetfulness: [0],

      // Optional vitals
      systolicBP: [120],
      diastolicBP: [80],
      cholesterolTotal: [200],
      cholesterolLDL: [120],
      cholesterolHDL: [55],
      cholesterolTriglycerides: [140],
    });
  }

  ngOnInit(): void {}

  get totalSteps(): number {
    return this.steps.length;
  }

  get progressPercent(): number {
    return ((this.currentStep) / this.totalSteps) * 100;
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
    } else {
      this.submitAssessment();
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  toggleBinary(field: string): void {
    const current = this.form.get(field)?.value;
    this.form.get(field)?.setValue(current === 1 ? 0 : 1);
  }

  getBinaryValue(field: string): boolean {
    return this.form.get(field)?.value === 1;
  }

  getSliderValue(field: string): number {
    return this.form.get(field)?.value ?? 0;
  }

  updateSlider(field: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.form.get(field)?.setValue(val);
  }

  submitAssessment(): void {
    this.isLoading = true;
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    console.log('Token:', token);  // ADD THIS


    this.http.post<AssessmentResult>(this.apiUrl, this.form.value, { headers })
      .subscribe({
        next: (result) => {
          this.assessmentResult = result;
          this.isLoading = false;
          // Pin to profile
          //localStorage.setItem('lastAssessmentResult', JSON.stringify(result));
          localStorage.setItem('assessmentResult', JSON.stringify(result));
          localStorage.removeItem('showWelcomeFlow');
          this.toastr.success('Assessment completed!', '🧠 Results Ready');
        },
        error: (err) => {
          console.error(err);
          this.toastr.error('Assessment failed. Please try again.');
          this.isLoading = false;
        }
      });
  }

  pinToProfile(): void {
  // Save with a clear key the profile can read
  localStorage.setItem('assessmentResult', JSON.stringify(this.assessmentResult));
  this.completed.emit(this.assessmentResult!);
  // Navigation handled by parent (AssessmentPageComponent)
}

  skip(): void {
    localStorage.removeItem('showWelcomeFlow');
    this.skipped.emit();
  }

  getSeverityColor(level: string): string {
    switch (level?.toLowerCase()) {
      case 'mild': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'severe': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  }

  getRiskColor(level: string): string {
    switch (level?.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  }


 
}
