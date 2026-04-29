import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentListItemComponent } from './appointment-list-item.component';

describe('AppointmentListItemComponent', () => {
  let component: AppointmentListItemComponent;
  let fixture: ComponentFixture<AppointmentListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppointmentListItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
