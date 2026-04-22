import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyMeListComponent } from './daily-me-list.component';

describe('DailyMeListComponent', () => {
  let component: DailyMeListComponent;
  let fixture: ComponentFixture<DailyMeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DailyMeListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyMeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
