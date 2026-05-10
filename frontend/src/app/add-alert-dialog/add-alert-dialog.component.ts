import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../features/front-office/pages/login/auth.service';
import { UserService, Patient } from '../core/services/user.service';
import { Incident } from '../core/model/alerts.models';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface Contact {
  userId: string;
  name: string;
  profilePicture?: string;
  role: string;
}

@Component({
  selector: 'app-add-alert-dialog',
  templateUrl: './add-alert-dialog.component.html',
  styleUrls: ['./add-alert-dialog.component.css']
})
export class AddAlertDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  contacts: Contact[] = [];
  loading = false;
  currentUserId: string | null = null;
  private userSub?: Subscription;
  private scheduleSub?: Subscription;

  notificationChannels = [
    { id: 'in-app', label: 'In-App', icon: 'bell' },
    { id: 'sms', label: 'SMS', icon: 'smartphone' },
    { id: 'email', label: 'Email', icon: 'mail' }
  ];

  daysOfWeek = [
    { value: 'MON', label: 'Mon' },
    { value: 'TUE', label: 'Tue' },
    { value: 'WED', label: 'Wed' },
    { value: 'THU', label: 'Thu' },
    { value: 'FRI', label: 'Fri' },
    { value: 'SAT', label: 'Sat' },
    { value: 'SUN', label: 'Sun' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddAlertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { incident: Incident; alert?: any },
    private authService: AuthService,
    private userService: UserService
  ) {
    this.form = this.fb.group({
      targetId: ['', Validators.required],
      notificationChannels: [[] as string[], Validators.required],
      immediate: [true],
      label: [''],
      scheduledTime: [''],
      repeatDays: [[] as string[]]
    });
  }

  ngOnInit(): void {
    if (this.data?.alert) {
      const alert = this.data.alert;
      const scheduledTime = this.normalizeScheduledTime(alert.scheduledTime);
      this.form.patchValue({
        ...alert,
        immediate: alert.immediate ?? !scheduledTime,
        scheduledTime,
        repeatDays: alert.repeatDays || [],
        notificationChannels: alert.notificationChannels || []
      });
    }

    this.syncScheduleValidators(this.form.get('immediate')?.value);
    this.scheduleSub = this.form.get('immediate')?.valueChanges.subscribe((immediate: boolean) => {
      this.syncScheduleValidators(immediate);
    });

    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.userId || null;
    });

    if (this.data.incident?.patientId) {
      this.loadContactsForPatient(this.data.incident.patientId);
    } else {
      console.error('No patientId in incident data');
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.scheduleSub?.unsubscribe();
  }

  loadContactsForPatient(patientId: string): void {
    this.loading = true;

    this.userService.getUserById(patientId).subscribe({
      next: (patientUser) => {
        const contacts: Contact[] = [{
          userId: patientUser.userId,
          name: patientUser.name,
          profilePicture: patientUser.profilePicture,
          role: 'Self (Patient)'
        }];

        const emails: string[] = [];
        if (patientUser.caregiverEmails?.length) {
          emails.push(...patientUser.caregiverEmails);
        }
        if (patientUser.doctorEmail) {
          emails.push(patientUser.doctorEmail);
        }
        if (patientUser.doctorEmails?.length) {
          emails.push(...patientUser.doctorEmails);
        }

        if (emails.length === 0) {
          this.contacts = contacts;
          this.loading = false;
          return;
        }

        const requests = emails.map(email =>
          this.userService.getUserByEmail(email).pipe(
            catchError(() => of(null))
          )
        );

        forkJoin(requests).pipe(
          map(users => users.filter(u => u !== null) as Patient[])
        ).subscribe(users => {
          users.forEach(u => {
            contacts.push({
              userId: u.userId,
              name: u.name,
              profilePicture: u.profilePicture,
              role: u.role === 'DOCTOR' ? 'Doctor' : 'Caregiver'
            });
          });
          this.contacts = contacts;
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('Failed to load patient', err);
        this.loading = false;
      }
    });
  }

  get notificationChannelsDisplay(): string {
    const channels = this.form.get('notificationChannels')?.value as string[] || [];
    return channels.map(c => c.toUpperCase()).join(', ');
  }

  get scheduledTimeDisplay(): string {
    return this.formatTime(this.form.get('scheduledTime')?.value);
  }

  get scheduleModeLabel(): string {
    return this.form.get('immediate')?.value ? 'Immediate delivery' : 'Scheduled delivery';
  }

  toggleChannel(channelId: string, checked: boolean): void {
    const channels = this.form.get('notificationChannels')?.value as string[];
    if (checked) {
      if (!channels.includes(channelId)) {
        this.form.patchValue({ notificationChannels: [...channels, channelId] });
      }
    } else {
      this.form.patchValue({ notificationChannels: channels.filter(c => c !== channelId) });
    }
  }

  toggleRepeatDay(day: string): void {
    const current = this.form.get('repeatDays')?.value as string[];
    if (current.includes(day)) {
      this.form.patchValue({ repeatDays: current.filter(d => d !== day) });
    } else {
      this.form.patchValue({ repeatDays: [...current, day] });
    }
  }

  setImmediate(value: boolean): void {
    this.form.patchValue({ immediate: value });
  }

  save(): void {
    const immediate = this.form.get('immediate')?.value === true;

    if (!immediate && !this.form.get('scheduledTime')?.value) {
      this.form.get('scheduledTime')?.markAsTouched();
      this.form.updateValueAndValidity();
      return;
    }

    if (this.form.valid) {
      const formValue = this.form.value;
      const alertData = {
        ...formValue,
        immediate,
        scheduledTime: immediate ? null : this.normalizeScheduledTime(formValue.scheduledTime),
        repeatDays: immediate ? [] : formValue.repeatDays,
        incidentId: this.data.incident.incidentId,
        senderId: this.currentUserId || 'unknown',
      };
      this.dialogRef.close(alertData);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getSelectedContactName(): string {
    const targetId = this.form.get('targetId')?.value;
    const contact = this.contacts.find(c => c.userId === targetId);
    return contact ? contact.name : '';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  private syncScheduleValidators(immediate: boolean): void {
    const scheduledTime = this.form.get('scheduledTime');

    if (immediate) {
      scheduledTime?.clearValidators();
      this.form.patchValue({ scheduledTime: '', repeatDays: [] }, { emitEvent: false });
    } else {
      scheduledTime?.setValidators([Validators.required]);
    }

    scheduledTime?.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeScheduledTime(value: string | null | undefined): string {
    if (!value) return '';
    const match = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  private formatTime(value: string | null | undefined): string {
    const normalized = this.normalizeScheduledTime(value);
    if (!normalized) return 'Choose time';

    const [hourValue, minute] = normalized.split(':').map(Number);
    const period = hourValue >= 12 ? 'PM' : 'AM';
    const hour = hourValue % 12 || 12;
    return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
  }
}
