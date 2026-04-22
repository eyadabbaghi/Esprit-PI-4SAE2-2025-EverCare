import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollDownButtonComponent } from './scroll-down-button.component';

describe('ScrollDownButtonComponent', () => {
  let component: ScrollDownButtonComponent;
  let fixture: ComponentFixture<ScrollDownButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScrollDownButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrollDownButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
