import { TestBed } from '@angular/core/testing';

import { MedicamentService } from './medicament.service';

describe('MedicamentService', () => {
  let service: MedicamentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MedicamentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
