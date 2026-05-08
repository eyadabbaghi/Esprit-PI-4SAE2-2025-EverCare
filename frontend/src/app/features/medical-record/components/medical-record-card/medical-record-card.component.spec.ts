import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { MedicalRecordCardComponent } from './medical-record-card.component';

describe('MedicalRecordCardComponent', () => {
  let component: MedicalRecordCardComponent;
  let fixture: ComponentFixture<MedicalRecordCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MedicalRecordCardComponent],
      imports: [RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicalRecordCardComponent);
    component = fixture.componentInstance;
    component.record = {
      id: 'mr-test',
      patientId: 'patient-test',
      bloodGroup: 'A+',
      alzheimerStage: 'EARLY',
      allergies: null,
      chronicDiseases: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      active: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
