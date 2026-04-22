import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectScrollDownButtonComponent } from './select-scroll-down-button.component';

describe('SelectScrollDownButtonComponent', () => {
  let component: SelectScrollDownButtonComponent;
  let fixture: ComponentFixture<SelectScrollDownButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectScrollDownButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectScrollDownButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
