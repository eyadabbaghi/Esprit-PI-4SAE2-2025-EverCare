import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyTaskListComponent } from './daily-task-list.component';

describe('DailyTaskListComponent', () => {
  let component: DailyTaskListComponent;
  let fixture: ComponentFixture<DailyTaskListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DailyTaskListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyTaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
