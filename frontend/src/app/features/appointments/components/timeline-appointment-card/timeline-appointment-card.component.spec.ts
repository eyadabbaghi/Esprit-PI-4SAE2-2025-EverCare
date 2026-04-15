import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelineAppointmentCardComponent } from './timeline-appointment-card.component';

describe('TimelineAppointmentCardComponent', () => {
  let component: TimelineAppointmentCardComponent;
  let fixture: ComponentFixture<TimelineAppointmentCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimelineAppointmentCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimelineAppointmentCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
