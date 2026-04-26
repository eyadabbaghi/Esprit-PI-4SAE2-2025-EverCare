import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyTaskFormComponent } from './daily-task-form.component';

describe('DailyTaskFormComponent', () => {
  let component: DailyTaskFormComponent;
  let fixture: ComponentFixture<DailyTaskFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DailyTaskFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyTaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
