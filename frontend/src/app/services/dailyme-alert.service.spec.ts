import { TestBed } from '@angular/core/testing';

import { DailymeAlertService } from './dailyme-alert.service';

describe('DailymeAlertService', () => {
  let service: DailymeAlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DailymeAlertService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
