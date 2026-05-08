import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import {
  OnboardingTutorialService,
  TutorialSession,
  TutorialStep,
} from './onboarding-tutorial.service';

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-onboarding-tutorial',
  templateUrl: './onboarding-tutorial.component.html',
  styleUrls: ['./onboarding-tutorial.component.css'],
})
export class OnboardingTutorialComponent implements OnInit, OnDestroy {
  session: TutorialSession | null = null;
  highlight: HighlightBox | null = null;
  private readonly sub = new Subscription();

  constructor(
    public readonly tutorial: OnboardingTutorialService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.tutorial.session$.subscribe((session) => {
        this.session = session;
        this.scheduleHighlightUpdate();
      }),
    );

    this.sub.add(
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
        this.tutorial.startPendingIfNeeded();
        this.scheduleHighlightUpdate();
      }),
    );

    setTimeout(() => this.tutorial.startPendingIfNeeded(), 500);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateHighlight();
  }

  get currentStep(): TutorialStep | null {
    if (!this.session) {
      return null;
    }
    return this.session.steps[this.session.index];
  }

  get isLastStep(): boolean {
    return !!this.session && this.session.index === this.session.steps.length - 1;
  }

  get progressPercent(): number {
    if (!this.session) {
      return 0;
    }
    return ((this.session.index + 1) / this.session.steps.length) * 100;
  }

  next(): void {
    this.tutorial.next();
    this.scheduleHighlightUpdate();
  }

  back(): void {
    this.tutorial.back();
    this.scheduleHighlightUpdate();
  }

  skip(): void {
    this.tutorial.skip();
  }

  private scheduleHighlightUpdate(): void {
    setTimeout(() => this.updateHighlight(), 220);
  }

  private updateHighlight(): void {
    const step = this.currentStep;
    if (!step || typeof document === 'undefined') {
      this.highlight = null;
      return;
    }

    const target = document.querySelector(step.targetSelector);
    if (!target) {
      this.highlight = null;
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = 8;
    this.highlight = {
      top: Math.max(rect.top - padding, 8),
      left: Math.max(rect.left - padding, 8),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
  }
}
