import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorPrescriptionPageComponent } from './doctor-prescription-page.component';

describe('DoctorPrescriptionPageComponent', () => {
  let component: DoctorPrescriptionPageComponent;
  let fixture: ComponentFixture<DoctorPrescriptionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DoctorPrescriptionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorPrescriptionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
