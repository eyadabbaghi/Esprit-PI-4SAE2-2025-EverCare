import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectValueComponent } from './select-value.component';

describe('SelectValueComponent', () => {
  let component: SelectValueComponent;
  let fixture: ComponentFixture<SelectValueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectValueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectValueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
