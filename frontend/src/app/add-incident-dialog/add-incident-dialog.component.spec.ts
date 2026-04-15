import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddIncidentDialogComponent } from './add-incident-dialog.component';

describe('AddIncidentDialogComponent', () => {
  let component: AddIncidentDialogComponent;
  let fixture: ComponentFixture<AddIncidentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddIncidentDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddIncidentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
