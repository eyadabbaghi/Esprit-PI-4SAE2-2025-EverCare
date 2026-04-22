import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectScrollUpButtonComponent } from './select-scroll-up-button.component';

describe('SelectScrollUpButtonComponent', () => {
  let component: SelectScrollUpButtonComponent;
  let fixture: ComponentFixture<SelectScrollUpButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectScrollUpButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectScrollUpButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
