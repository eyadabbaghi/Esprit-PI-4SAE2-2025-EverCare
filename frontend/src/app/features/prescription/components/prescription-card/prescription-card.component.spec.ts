import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrescriptionCardComponent } from './prescription-card.component';

describe('PrescriptionCardComponent', () => {
  let component: PrescriptionCardComponent;
  let fixture: ComponentFixture<PrescriptionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrescriptionCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrescriptionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
