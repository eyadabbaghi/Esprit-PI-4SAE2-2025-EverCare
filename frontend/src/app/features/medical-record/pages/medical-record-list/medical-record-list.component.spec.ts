import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../front-office/pages/login/auth.service';
import { MedicalRecordCardComponent } from '../../components/medical-record-card/medical-record-card.component';

import { MedicalRecordListComponent } from './medical-record-list.component';

describe('MedicalRecordListComponent', () => {
  let component: MedicalRecordListComponent;
  let fixture: ComponentFixture<MedicalRecordListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MedicalRecordListComponent, MedicalRecordCardComponent],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: { currentUser$: of({ name: 'Doc', email: 'doctor@evercare.tn', role: 'DOCTOR' }) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicalRecordListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
