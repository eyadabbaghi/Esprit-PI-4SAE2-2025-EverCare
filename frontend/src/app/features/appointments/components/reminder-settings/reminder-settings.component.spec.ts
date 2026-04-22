import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReminderSettingsComponent } from './reminder-settings.component';

describe('ReminderSettingsComponent', () => {
  let component: ReminderSettingsComponent;
  let fixture: ComponentFixture<ReminderSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReminderSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReminderSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
