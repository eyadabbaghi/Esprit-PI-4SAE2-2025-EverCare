import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAlertDialogComponent } from './add-alert-dialog.component';

describe('AddAlertDialogComponent', () => {
  let component: AddAlertDialogComponent;
  let fixture: ComponentFixture<AddAlertDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddAlertDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAlertDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
