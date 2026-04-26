import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectSeparatorComponent } from './select-separator.component';

describe('SelectSeparatorComponent', () => {
  let component: SelectSeparatorComponent;
  let fixture: ComponentFixture<SelectSeparatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectSeparatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectSeparatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
