import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyMeFormComponent } from './daily-me-form.component';

describe('DailyMeFormComponent', () => {
  let component: DailyMeFormComponent;
  let fixture: ComponentFixture<DailyMeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DailyMeFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyMeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
