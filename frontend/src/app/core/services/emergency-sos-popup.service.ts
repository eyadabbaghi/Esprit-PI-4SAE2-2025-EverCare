import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EmergencySosPopupService {
  private readonly showSubject = new Subject<void>();
  readonly show$ = this.showSubject.asObservable();

  show(): void {
    this.showSubject.next();
  }
}
