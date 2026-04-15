import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrontOfficeLayoutComponent } from './front-office-layout.component';

describe('FrontOfficeLayoutComponent', () => {
  let component: FrontOfficeLayoutComponent;
  let fixture: ComponentFixture<FrontOfficeLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FrontOfficeLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FrontOfficeLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
