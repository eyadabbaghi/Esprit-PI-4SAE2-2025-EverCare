import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailymeAlertCardComponent } from './dailyme-alert-card.component';

describe('DailymeAlertCardComponent', () => {
  let component: DailymeAlertCardComponent;
  let fixture: ComponentFixture<DailymeAlertCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DailymeAlertCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailymeAlertCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
