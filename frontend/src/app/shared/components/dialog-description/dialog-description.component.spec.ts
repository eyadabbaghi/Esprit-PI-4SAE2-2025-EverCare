import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogDescriptionComponent } from './dialog-description.component';

describe('DialogDescriptionComponent', () => {
  let component: DialogDescriptionComponent;
  let fixture: ComponentFixture<DialogDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DialogDescriptionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
