import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService, User } from '../login/auth.service';

@Component({
  selector: 'app-doctor-search-modal',
  templateUrl: './doctor-search-modal.component.html',
})
export class DoctorSearchModalComponent implements OnInit {
  @Input() open = false;
  @Input() role: 'DOCTOR' | 'CAREGIVER' | 'PATIENT' = 'DOCTOR';
  @Output() closed = new EventEmitter<void>();
  @Output() userSelected = new EventEmitter<User>();

  searchControl = new FormControl('');
  searchResults: User[] = [];
  isLoading = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || term.length < 2) {
          return of([]);
        }
        this.isLoading = true;
        return this.authService.searchUsersByRole(term, this.role);
      })
    ).subscribe(results => {
      this.searchResults = results;
      this.isLoading = false;
    });
  }

  close(): void {
    this.closed.emit();
    this.searchResults = [];
    this.searchControl.setValue('');
  }

  selectUser(user: User): void {
    this.userSelected.emit(user);
    this.close();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
}