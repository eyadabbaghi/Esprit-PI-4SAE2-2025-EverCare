import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailymeAlertsComponent } from './dailyme-alerts.component';

describe('DailymeAlertsComponent', () => {
  let component: DailymeAlertsComponent;
  let fixture: ComponentFixture<DailymeAlertsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DailymeAlertsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailymeAlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
