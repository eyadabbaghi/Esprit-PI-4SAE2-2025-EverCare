import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultationTypeManagerComponent } from './consultation-type-manager.component';

describe('ConsultationTypeManagerComponent', () => {
  let component: ConsultationTypeManagerComponent;
  let fixture: ComponentFixture<ConsultationTypeManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ConsultationTypeManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsultationTypeManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
