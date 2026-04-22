import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

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
  completed: boolean;
  favorite: boolean;
  doctorSuggested?: boolean;
  completedAt?: Date;
  imageUrl: string;
  rating: number;
  totalRatings: number;
}

@Component({
  selector: 'app-activity-details',
  templateUrl: './activity-details.component.html',
  styleUrls: ['./activity-details.component.css'],
})
export class ActivityDetailsComponent implements OnInit {
  activity: Activity | null = null;
  userRating = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/activities']);
      return;
    }

    const all = this.buildMockActivities();
    this.activity = all.find((a) => a.id === id) ?? null;

    if (!this.activity) {
      this.toastr.error('Activity not found');
      this.router.navigate(['/activities']);
    }
  }

  private buildMockActivities(): Activity[] {
    // Keep this in sync with ActivitiesComponent
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
        completed: false,
        favorite: true,
        doctorSuggested: true,
        imageUrl:
          'https://images.unsplash.com/photo-1562658048-b4c459feab21?auto=format&fit=crop&w=1080&q=80',
        rating: 4.8,
        totalRatings: 142,
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
        completed: true,
        favorite: false,
        imageUrl:
          'https://images.unsplash.com/photo-1737505599159-5ffc1dcbc08f?auto=format&fit=crop&w=1080&q=80',
        rating: 4.5,
        totalRatings: 98,
      },
      {
        id: '3',
        name: 'Gentle Walking',
        type: 'Physical',
        duration: 30,
        scheduledTime: '04:00 PM',
        description:
          'Light walking exercise in a safe, familiar environment. Regular walking helps maintain physical health, mobility, and mental well-being.',
        instructions: [
          'Wear comfortable, supportive shoes',
          'Choose a safe, familiar walking area',
          'Maintain a comfortable, steady pace',
          'Stay hydrated with water breaks',
          'Walk for 15-30 minutes based on comfort',
          'Use walking aids if needed',
          'Cool down with gentle stretches',
        ],
        difficulty: 'Easy',
        recommendedStage: ['Early', 'Moderate'],
        frequency: 'Daily',
        supervision: 'Companion recommended for safety',
        benefits: [
          'Improves cardiovascular health',
          'Boosts mood and energy',
          'Maintains mobility and balance',
          'Provides social interaction',
        ],
        precautions: [
          'Ensure safe walking path',
          'Avoid extreme weather conditions',
          'Monitor for fatigue',
        ],
        completed: false,
        favorite: true,
        imageUrl:
          'https://images.unsplash.com/photo-1764628039015-222c6d30c68d?auto=format&fit=crop&w=1080&q=80',
        rating: 4.7,
        totalRatings: 215,
      },
      {
        id: '4',
        name: 'Music Therapy Session',
        type: 'Creative',
        duration: 25,
        scheduledTime: '02:00 PM',
        description:
          'Listen to favorite songs and engage with familiar melodies. Music therapy triggers positive memories and enhances emotional well-being.',
        instructions: [
          'Choose familiar, favorite songs from their era',
          'Create a comfortable listening environment',
          'Encourage singing or humming along',
          'Discuss memories associated with the music',
          'Use simple instruments if available',
          'Share stories about the songs',
          'End with a calming piece',
        ],
        difficulty: 'Easy',
        recommendedStage: ['Early', 'Moderate', 'Advanced'],
        frequency: '4 times per week',
        supervision: 'Minimal supervision needed',
        benefits: [
          'Triggers positive memories',
          'Reduces stress and anxiety',
          'Enhances emotional well-being',
          'Provides enjoyment and comfort',
        ],
        completed: false,
        favorite: true,
        doctorSuggested: true,
        imageUrl:
          'https://images.unsplash.com/photo-1741770067276-a10e15ff5197?auto=format&fit=crop&w=1080&q=80',
        rating: 4.9,
        totalRatings: 187,
      },
      {
        id: '5',
        name: 'Photo Album Review',
        type: 'Cognitive',
        duration: 30,
        scheduledTime: '11:00 AM',
        description:
          'Review family photos and discuss memories together. This activity stimulates memory recall and provides meaningful social connection.',
        instructions: [
          'Gather family photo albums or digital photos',
          'Sit in a comfortable, well-lit area',
          'Look through photos together slowly',
          'Ask gentle questions about the photos',
          'Listen to stories and memories',
          'Label photos if helpful for future reference',
          'Focus on positive memories and emotions',
        ],
        difficulty: 'Easy',
        recommendedStage: ['Early', 'Moderate', 'Advanced'],
        frequency: '3 times per week',
        supervision: 'Caregiver participation required',
        benefits: [
          'Stimulates memory recall',
          'Provides social interaction',
          'Strengthens family bonds',
          'Triggers positive emotions',
        ],
        completed: false,
        favorite: false,
        imageUrl:
          'https://images.unsplash.com/photo-1587955793432-7c4ff80918ba?auto=format&fit=crop&w=1080&q=80',
        rating: 4.6,
        totalRatings: 156,
      },
      {
        id: '6',
        name: 'Simple Art & Coloring',
        type: 'Creative',
        duration: 40,
        description:
          'Creative expression through simple art activities. Art therapy provides sensory stimulation and promotes relaxation.',
        instructions: [
          'Set up art supplies in a comfortable space',
          'Provide coloring books or simple drawing materials',
          'Encourage free expression without judgment',
          'No pressure for perfection - focus on enjoyment',
          'Display finished artwork proudly',
          'Clean up together as part of the activity',
          'Praise effort and creativity',
        ],
        difficulty: 'Easy',
        recommendedStage: ['Early', 'Moderate', 'Advanced'],
        frequency: '2-3 times per week',
        supervision: 'Minimal supervision needed',
        benefits: [
          'Promotes creativity and self-expression',
          'Reduces anxiety and stress',
          'Provides sensory stimulation',
          'Builds confidence',
        ],
        completed: false,
        favorite: false,
        imageUrl:
          'https://images.unsplash.com/photo-1761034036989-24640be78e90?auto=format&fit=crop&w=1080&q=80',
        rating: 4.4,
        totalRatings: 123,
      },
    ];
  }

  backToList(): void {
    this.router.navigate(['/activities']);
  }

  rate(rating: number): void {
    if (!this.activity) {
      return;
    }
    this.userRating = rating;
    this.activity.rating =
      (this.activity.rating * this.activity.totalRatings + rating) /
      (this.activity.totalRatings + 1);
    this.activity.totalRatings += 1;
    this.toastr.success(`You rated this activity ${rating} star${rating !== 1 ? 's' : ''}`);
  }
}

