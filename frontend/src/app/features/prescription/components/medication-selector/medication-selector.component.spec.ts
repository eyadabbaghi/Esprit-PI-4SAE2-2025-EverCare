import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicationSelectorComponent } from './medication-selector.component';

describe('MedicationSelectorComponent', () => {
  let component: MedicationSelectorComponent;
  let fixture: ComponentFixture<MedicationSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MedicationSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedicationSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
