import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorAppointmentsPageComponent } from './doctor-appointments-page.component';

describe('DoctorAppointmentsPageComponent', () => {
  let component: DoctorAppointmentsPageComponent;
  let fixture: ComponentFixture<DoctorAppointmentsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DoctorAppointmentsPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorAppointmentsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
