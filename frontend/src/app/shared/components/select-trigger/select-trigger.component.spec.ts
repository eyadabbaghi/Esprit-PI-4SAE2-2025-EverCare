import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectTriggerComponent } from './select-trigger.component';

describe('SelectTriggerComponent', () => {
  let component: SelectTriggerComponent;
  let fixture: ComponentFixture<SelectTriggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectTriggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectTriggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
