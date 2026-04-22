import { Component } from '@angular/core';
import { Router } from '@angular/router';

type ActivityType = 'Relaxation' | 'Cognitive' | 'Physical' | 'Social' | 'Creative';
type DifficultyLevel = 'Easy' | 'Moderate' | 'Challenging';
type AlzheimerStage = 'Early' | 'Moderate' | 'Advanced';

interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  duration: number;
  scheduledTime?: string;
  description: string;
  instructions: string[];
  difficulty: DifficultyLevel;
  recommendedStage: AlzheimerStage[];
  frequency: string;
  supervision: string;
  benefits: string[];
  precautions?: string[];
  imageUrl: string;
  rating: number;
  totalRatings: number;
  doctorSuggested?: boolean;
}

@Component({
  selector: 'app-activities-admin',
  templateUrl: './activities-admin.component.html',
  styleUrls: ['./activities-admin.component.css'],
})
export class ActivitiesAdminComponent {
  activities: Activity[] = [];
  selectedActivity: Activity | null = null;

  formMode: 'create' | 'edit' = 'create';
  formModel: Activity = this.createEmptyActivity();

  currentPage = 1;
  pageSize = 4;

  activityTypes: ActivityType[] = ['Relaxation', 'Cognitive', 'Physical', 'Social', 'Creative'];
  difficultyLevels: DifficultyLevel[] = ['Easy', 'Moderate', 'Challenging'];
  stages: AlzheimerStage[] = ['Early', 'Moderate', 'Advanced'];

  constructor(private readonly router: Router) {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Keep this visually aligned with the front-office activities
    this.activities = [
      {
        id: '1',
        name: 'Morning Breathing Exercise',
        type: 'Relaxation',
        duration: 10,
        scheduledTime: '08:00 AM',
        description:
          'Gentle breathing exercises to start the day with calm and focus. This mindfulness practice helps reduce anxiety and promotes mental clarity.',
        instructions: [
          'Find a comfortable seated position in a quiet space',
          'Close your eyes gently or maintain a soft gaze',
          'Breathe in slowly through your nose for 4 counts',
          'Hold your breath gently for 2 counts',
          'Breathe out slowly through your mouth for 6 counts',
          'Repeat this cycle for 10 minutes',
          'Notice how your body relaxes with each breath',
        ],
        difficulty: 'Easy',
        recommendedStage: ['Early', 'Moderate', 'Advanced'],
        frequency: 'Daily',
        supervision: 'Independent or minimal supervision',
        benefits: [
          'Reduces anxiety and stress',
          'Improves focus and concentration',
          'Promotes relaxation and calm',
          'Enhances overall well-being',
        ],
        imageUrl:
          'https://images.unsplash.com/photo-1562658048-b4c459feab21?auto=format&fit=crop&w=1080&q=80',
        rating: 4.8,
        totalRatings: 142,
        doctorSuggested: true,
      },
      {
        id: '2',
        name: 'Memory Card Game',
        type: 'Cognitive',
        duration: 20,
        scheduledTime: '10:00 AM',
        description:
          'Fun card matching game to exercise memory and recognition skills. This engaging activity stimulates cognitive function and provides mental exercise.',
        instructions: [
          'Lay out 12 cards face down in a grid pattern',
          'Turn over two cards at a time',
          'Try to find matching pairs',
          'Remember where cards are located',
          'Continue until all pairs are found',
          'Celebrate each successful match',
        ],
        difficulty: 'Moderate',
        recommendedStage: ['Early', 'Moderate'],
        frequency: '3 times per week',
        supervision: 'Caregiver presence recommended',
        benefits: [
          'Enhances memory recall',
          'Improves concentration and focus',
          'Provides mental stimulation',
          'Boosts confidence',
        ],
        precautions: [
          'Start with fewer cards if needed',
          'Take breaks if frustrated',
          'Keep sessions positive and encouraging',
        ],
        imageUrl:
          'https://images.unsplash.com/photo-1737505599159-5ffc1dcbc08f?auto=format&fit=crop&w=1080&q=80',
        rating: 4.5,
        totalRatings: 98,
      },
    ];

    this.selectedActivity = this.activities[0] ?? null;
  }

  get pagedActivities(): Activity[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.activities.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.activities.length / this.pageSize) || 1);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  createEmptyActivity(): Activity {
    return {
      id: '',
      name: '',
      type: 'Relaxation',
      duration: 10,
      scheduledTime: '',
      description: '',
      instructions: [''],
      difficulty: 'Easy',
      recommendedStage: [],
      frequency: '',
      supervision: '',
      benefits: [''],
      precautions: [],
      imageUrl: '',
      rating: 4.5,
      totalRatings: 0,
      doctorSuggested: false,
    };
  }

  selectActivity(activity: Activity): void {
    this.selectedActivity = activity;
    this.formMode = 'edit';
    this.formModel = {
      ...activity,
      instructions: [...activity.instructions],
      benefits: [...activity.benefits],
      precautions: activity.precautions ? [...activity.precautions] : [],
      recommendedStage: [...activity.recommendedStage],
    };
  }

  goToDetails(activity: Activity): void {
    this.router.navigate(['/admin/activities', activity.id], {
      state: { activity },
    });
  }

  startCreate(): void {
    this.formMode = 'create';
    this.formModel = this.createEmptyActivity();
    this.selectedActivity = null;
  }

  addInstruction(): void {
    this.formModel.instructions = [...this.formModel.instructions, ''];
  }

  removeInstruction(index: number): void {
    this.formModel.instructions = this.formModel.instructions.filter((_, i) => i !== index);
  }

  addBenefit(): void {
    this.formModel.benefits = [...this.formModel.benefits, ''];
  }

  removeBenefit(index: number): void {
    this.formModel.benefits = this.formModel.benefits.filter((_, i) => i !== index);
  }

  addPrecaution(): void {
    const current = this.formModel.precautions ?? [];
    this.formModel.precautions = [...current, ''];
  }

  removePrecaution(index: number): void {
    if (!this.formModel.precautions) {
      return;
    }
    this.formModel.precautions = this.formModel.precautions.filter((_, i) => i !== index);
  }

  toggleStage(stage: AlzheimerStage): void {
    if (this.formModel.recommendedStage.includes(stage)) {
      this.formModel.recommendedStage = this.formModel.recommendedStage.filter((s) => s !== stage);
    } else {
      this.formModel.recommendedStage = [...this.formModel.recommendedStage, stage];
    }
  }

  saveActivity(): void {
    const cleaned: Activity = {
      ...this.formModel,
      id: this.formMode === 'create' || !this.formModel.id ? this.generateId() : this.formModel.id,
      instructions: this.formModel.instructions.filter((s) => s.trim().length > 0),
      benefits: this.formModel.benefits.filter((s) => s.trim().length > 0),
      precautions: this.formModel.precautions?.filter((s) => s.trim().length > 0),
    };

    if (this.formMode === 'create' || !this.activities.find((a) => a.id === cleaned.id)) {
      this.activities = [...this.activities, cleaned];
    } else {
      this.activities = this.activities.map((a) => (a.id === cleaned.id ? cleaned : a));
    }

    this.selectedActivity = cleaned;
    this.formMode = 'edit';
    this.formModel = {
      ...cleaned,
      instructions: [...cleaned.instructions],
      benefits: [...cleaned.benefits],
      precautions: cleaned.precautions ? [...cleaned.precautions] : [],
      recommendedStage: [...cleaned.recommendedStage],
    };
  }

  deleteCurrentActivity(): void {
    if (!this.formModel.id) {
      return;
    }
    const target = this.activities.find((a) => a.id === this.formModel.id);
    if (!target) {
      return;
    }
    this.deleteActivity(target);
  }

  deleteActivity(activity: Activity): void {
    this.activities = this.activities.filter((a) => a.id !== activity.id);
    if (this.selectedActivity?.id === activity.id) {
      this.selectedActivity = this.activities[0] ?? null;
    }
    if (this.formModel.id === activity.id) {
      this.startCreate();
    }
  }

  private generateId(): string {
    const maxId = this.activities.reduce((max, a) => {
      const n = Number(a.id);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
    return String(maxId + 1);
  }
}

