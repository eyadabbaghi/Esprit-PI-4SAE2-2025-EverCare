import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackOfficeLayoutComponent } from './back-office-layout.component';

describe('BackOfficeLayoutComponent', () => {
  let component: BackOfficeLayoutComponent;
  let fixture: ComponentFixture<BackOfficeLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BackOfficeLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackOfficeLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
