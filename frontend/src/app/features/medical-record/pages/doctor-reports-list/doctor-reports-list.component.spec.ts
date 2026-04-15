import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { DoctorReportsListComponent } from './doctor-reports-list.component';

describe('DoctorReportsListComponent', () => {
  let component: DoctorReportsListComponent;
  let fixture: ComponentFixture<DoctorReportsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ReactiveFormsModule, RouterTestingModule],
      declarations: [DoctorReportsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorReportsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
