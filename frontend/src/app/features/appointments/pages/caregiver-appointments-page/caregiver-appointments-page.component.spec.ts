import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaregiverAppointmentsPageComponent } from './caregiver-appointments-page.component';

describe('CaregiverAppointmentsPageComponent', () => {
  let component: CaregiverAppointmentsPageComponent;
  let fixture: ComponentFixture<CaregiverAppointmentsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CaregiverAppointmentsPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaregiverAppointmentsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
