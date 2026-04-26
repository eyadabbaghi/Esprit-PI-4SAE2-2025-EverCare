import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogTitleComponent } from './dialog-title.component';

describe('DialogTitleComponent', () => {
  let component: DialogTitleComponent;
  let fixture: ComponentFixture<DialogTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DialogTitleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
