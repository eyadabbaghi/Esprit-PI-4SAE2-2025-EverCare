import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExceptionFormModalComponent } from './exception-form-modal.component';

describe('ExceptionFormModalComponent', () => {
  let component: ExceptionFormModalComponent;
  let fixture: ComponentFixture<ExceptionFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExceptionFormModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExceptionFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
