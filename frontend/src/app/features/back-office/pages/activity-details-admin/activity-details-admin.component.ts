import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

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
  location?: string;
  startTime?: string;
  monitoredBy?: string;
}

@Component({
  selector: 'app-activity-details-admin',
  templateUrl: './activity-details-admin.component.html',
  styleUrls: ['./activity-details-admin.component.css'],
})
export class ActivityDetailsAdminComponent implements OnInit {
  activity: Activity | null = null;
  isEditing = false;
  Math = Math;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const passed = (nav?.extras.state?.['activity'] as Activity | undefined) ?? undefined;
    if (passed) {
      this.activity = { ...passed };
      this.isEditing =
        !this.activity.description ||
        !this.activity.instructions?.length ||
        !this.activity.benefits?.length;
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/activities']);
      return;
    }

    const all = this.buildMockActivities();
    this.activity = all.find((a) => a.id === id) ?? null;

    if (!this.activity) {
      this.router.navigate(['/admin/activities']);
    }
  }

  private buildMockActivities(): Activity[] {
    return [
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
        precautions: [],
        imageUrl:
          'https://images.unsplash.com/photo-1562658048-b4c459feab21?auto=format&fit=crop&w=1080&q=80',
        rating: 4.8,
        totalRatings: 142,
        doctorSuggested: true,
        location: 'Living room or quiet area',
        startTime: '08:00 AM',
        monitoredBy: 'Primary caregiver',
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
        doctorSuggested: false,
        location: 'Kitchen table or game area',
        startTime: '10:00 AM',
        monitoredBy: 'Caregiver',
      },
    ];
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  addInstruction(): void {
    if (!this.activity) return;
    this.activity.instructions = [...this.activity.instructions, ''];
  }

  removeInstruction(index: number): void {
    if (!this.activity) return;
    this.activity.instructions = this.activity.instructions.filter((_, i) => i !== index);
  }

  addBenefit(): void {
    if (!this.activity) return;
    this.activity.benefits = [...this.activity.benefits, ''];
  }

  removeBenefit(index: number): void {
    if (!this.activity) return;
    this.activity.benefits = this.activity.benefits.filter((_, i) => i !== index);
  }

  addPrecaution(): void {
    if (!this.activity) return;
    const current = this.activity.precautions ?? [];
    this.activity.precautions = [...current, ''];
  }

  removePrecaution(index: number): void {
    if (!this.activity || !this.activity.precautions) return;
    this.activity.precautions = this.activity.precautions.filter((_, i) => i !== index);
  }

  save(): void {
    if (!this.activity) return;
    this.activity.instructions = this.activity.instructions.filter((s) => s.trim().length > 0);
    this.activity.benefits = this.activity.benefits.filter((s) => s.trim().length > 0);
    if (this.activity.precautions) {
      this.activity.precautions = this.activity.precautions.filter((s) => s.trim().length > 0);
    }
    this.isEditing = false;
  }

  deleteAndBack(): void {
    this.router.navigate(['/admin/activities']);
  }

  backToList(): void {
    this.router.navigate(['/admin/activities']);
  }
}

