import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvailabilityManagerComponent } from './availability-management.component';

describe('AvailabilityManagerComponent', () => {
  let component: AvailabilityManagerComponent;
  let fixture: ComponentFixture<AvailabilityManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AvailabilityManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvailabilityManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
