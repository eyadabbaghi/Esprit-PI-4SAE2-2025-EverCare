import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentPatientsTableComponent } from './recent-patients-table.component';

describe('RecentPatientsTableComponent', () => {
  let component: RecentPatientsTableComponent;
  let fixture: ComponentFixture<RecentPatientsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecentPatientsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentPatientsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
