import { TestBed } from '@angular/core/testing';

import { DailyMeService } from './daily-me.service';

describe('DailyMeService', () => {
  let service: DailyMeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DailyMeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
