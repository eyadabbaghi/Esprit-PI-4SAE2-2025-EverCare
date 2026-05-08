import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentFiltersComponent } from './appointment-filters.component';

describe('AppointmentFiltersComponent', () => {
  let component: AppointmentFiltersComponent;
  let fixture: ComponentFixture<AppointmentFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppointmentFiltersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
