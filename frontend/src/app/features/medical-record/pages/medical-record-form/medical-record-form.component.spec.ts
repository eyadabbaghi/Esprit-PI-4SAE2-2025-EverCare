import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../front-office/pages/login/auth.service';

import { MedicalRecordFormComponent } from './medical-record-form.component';

describe('MedicalRecordFormComponent', () => {
  let component: MedicalRecordFormComponent;
  let fixture: ComponentFixture<MedicalRecordFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MedicalRecordFormComponent],
      imports: [FormsModule, RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser$: of({ name: 'Doc', email: 'doctor@evercare.tn', role: 'DOCTOR' }) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicalRecordFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
