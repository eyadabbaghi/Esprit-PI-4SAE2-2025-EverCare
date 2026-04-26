import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../front-office/pages/login/auth.service';

import { MedicalRecordDetailsComponent } from './medical-record-details.component';

describe('MedicalRecordDetailsComponent', () => {
  let component: MedicalRecordDetailsComponent;
  let fixture: ComponentFixture<MedicalRecordDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MedicalRecordDetailsComponent],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser$: of({ name: 'Doc', email: 'doctor@evercare.tn', role: 'DOCTOR' }) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicalRecordDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
