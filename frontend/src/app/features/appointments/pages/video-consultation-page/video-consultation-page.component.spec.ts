import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoConsultationPageComponent } from './video-consultation-page.component';

describe('VideoConsultationPageComponent', () => {
  let component: VideoConsultationPageComponent;
  let fixture: ComponentFixture<VideoConsultationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VideoConsultationPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoConsultationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
