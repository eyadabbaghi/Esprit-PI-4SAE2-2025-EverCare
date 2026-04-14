import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../front-office/pages/login/auth.service';
import { AssessmentReportComponent } from './assessment-report.component';

describe('AssessmentReportComponent', () => {
  let component: AssessmentReportComponent;
  let fixture: ComponentFixture<AssessmentReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      declarations: [AssessmentReportComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser$: of(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssessmentReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
