import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorTabsComponent } from './doctor-tabs.component';

describe('DoctorTabsComponent', () => {
  let component: DoctorTabsComponent;
  let fixture: ComponentFixture<DoctorTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DoctorTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
