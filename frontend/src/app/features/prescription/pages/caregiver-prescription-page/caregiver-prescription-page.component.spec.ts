import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaregiverPrescriptionPageComponent } from './caregiver-prescription-page.component';

describe('CaregiverPrescriptionPageComponent', () => {
  let component: CaregiverPrescriptionPageComponent;
  let fixture: ComponentFixture<CaregiverPrescriptionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CaregiverPrescriptionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaregiverPrescriptionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
