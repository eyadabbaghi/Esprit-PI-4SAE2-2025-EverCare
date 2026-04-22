import { Component, EventEmitter, Output } from '@angular/core';

interface AssessmentQuestion {
  id: number;
  prompt: string;
  description: string;
}

@Component({
  selector: 'app-alzheimers-assessment',
  templateUrl: './alzheimers-assessment.component.html',
  styleUrls: ['./alzheimers-assessment.component.css'],
})
export class AlzheimersAssessmentComponent {
  @Output() closed = new EventEmitter<void>();

  currentStep = 0;
  answers: ('never' | 'sometimes' | 'often' | null)[] = [];

  readonly questions: AssessmentQuestion[] = [
    {
      id: 1,
      prompt: 'Daily memory changes',
      description:
        'How often do you or your loved one forget recent conversations, appointments, or events?',
    },
    {
      id: 2,
      prompt: 'Orientation & confusion',
      description:
        'How often do you notice confusion about dates, time of day, or familiar places?',
    },
    {
      id: 3,
      prompt: 'Attention & focus',
      description:
        'How often is it difficult to follow a conversation, TV show, or set of instructions?',
    },
    {
      id: 4,
      prompt: 'Mood & behaviour',
      description:
        'How often do you see changes in mood, personality, or withdrawal from social situations?',
    },
    {
      id: 5,
      prompt: 'Daily independence',
      description:
        'How often is extra help needed with medications, finances, or day-to-day tasks?',
    },
  ];

  constructor() {
    this.answers = this.questions.map(() => null);
  }

  get isLastStep(): boolean {
    return this.currentStep === this.questions.length - 1;
  }

  get progress(): number {
    return Math.round(((this.currentStep + 1) / this.questions.length) * 100);
  }

  selectAnswer(answer: 'never' | 'sometimes' | 'often'): void {
    this.answers[this.currentStep] = answer;
  }

  canContinue(): boolean {
    return this.answers[this.currentStep] !== null;
  }

  next(): void {
    if (!this.canContinue()) {
      return;
    }
    if (!this.isLastStep) {
      this.currentStep += 1;
    }
  }

  previous(): void {
    if (this.currentStep > 0) {
      this.currentStep -= 1;
    }
  }

  close(): void {
    this.closed.emit();
  }

  getSummaryMessage(): string {
    const score = this.answers.reduce((total, answer) => {
      if (answer === 'never') return total;
      if (answer === 'sometimes') return total + 1;
      if (answer === 'often') return total + 2;
      return total;
    }, 0);

    if (score <= 2) {
      return 'Your responses suggest that current memory changes may be mild. Continue monitoring and discuss any concerns with a healthcare professional.';
    }
    if (score <= 5) {
      return 'Your responses suggest some areas where additional support and monitoring might help. Consider discussing these changes with a doctor or specialist.';
    }
    return 'Your responses suggest notable changes that may benefit from a professional assessment. This tool is not a diagnosis—please talk with a healthcare provider for a full evaluation.';
  }
}

