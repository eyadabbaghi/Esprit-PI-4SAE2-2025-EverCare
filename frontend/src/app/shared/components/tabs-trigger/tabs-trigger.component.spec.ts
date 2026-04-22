import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabsTriggerComponent } from './tabs-trigger.component';

describe('TabsTriggerComponent', () => {
  let component: TabsTriggerComponent;
  let fixture: ComponentFixture<TabsTriggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TabsTriggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabsTriggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
