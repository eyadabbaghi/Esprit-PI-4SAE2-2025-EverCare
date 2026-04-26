import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientInfoCardComponent } from './patient-info-card.component';

describe('PatientInfoCardComponent', () => {
  let component: PatientInfoCardComponent;
  let fixture: ComponentFixture<PatientInfoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PatientInfoCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientInfoCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
