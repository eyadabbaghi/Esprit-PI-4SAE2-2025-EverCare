import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientPrescriptionPageComponent } from './patient-prescription-page.component';

describe('PatientPrescriptionPageComponent', () => {
  let component: PatientPrescriptionPageComponent;
  let fixture: ComponentFixture<PatientPrescriptionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PatientPrescriptionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientPrescriptionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
