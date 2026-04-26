import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPrescriptionsComponent } from './user-prescriptions.component';

describe('UserPrescriptionsComponent', () => {
  let component: UserPrescriptionsComponent;
  let fixture: ComponentFixture<UserPrescriptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserPrescriptionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserPrescriptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
