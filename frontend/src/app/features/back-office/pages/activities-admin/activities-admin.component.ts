import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ActivityService, Activity, ActivityDetails, ActivityWithDetails, CreateActivityRequest, UpdateActivityRequest, CreateActivityDetailsRequest, UpdateActivityDetailsRequest } from '../../../../core/services/activity.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';

// Custom validator: first letter uppercase
function firstLetterUppercase(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  const firstChar = value.charAt(0);
  if (firstChar !== firstChar.toUpperCase()) {
    return { firstLetterUppercase: true };
  }
  return null;
}

// Custom validator: at least one stage selected
function atLeastOneStage(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value || value.length === 0) {
    return { atLeastOneStage: true };
  }
  return null;
}

@Component({
  selector: 'app-activities-admin',
  templateUrl: './activities-admin.component.html',
  styleUrls: ['./activities-admin.component.css'],
})
export class ActivitiesAdminComponent implements OnInit {
  activities: Activity[] = [];
  activitiesWithDetails: ActivityWithDetails[] = [];
  selectedActivity: ActivityWithDetails | null = null;
  selectedDetails: ActivityDetails | null = null;

  formMode: 'create' | 'edit' = 'create';

  // Reactive forms
  activityForm: FormGroup;
  detailsForm: FormGroup;

  currentPage = 1;
  pageSize = 4;

  activityTypes = ['Relaxation', 'Cognitive', 'Physical', 'Social', 'Creative'];
  difficultyLevels: ('Easy' | 'Moderate' | 'Challenging')[] = ['Easy', 'Moderate', 'Challenging'];
  stages: ('Early' | 'Moderate' | 'Advanced')[] = ['Early', 'Moderate', 'Advanced'];
  timeOptions: string[] = [];
  private clickTimeout: any;

  // Image upload & cropper
  selectedFile: File | null = null;
  imageChangedEvent: any = '';
  croppedImage: any = '';
  showCropper = false;

  constructor(
    private fb: FormBuilder,
    private readonly router: Router,
    private activityService: ActivityService,
    private toastr: ToastrService
  ) {
    this.activityForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), firstLetterUppercase]],
      type: ['Relaxation', Validators.required],
      duration: [10, [Validators.required, Validators.min(1), Validators.max(480)]],
      scheduledTime: [''],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      imageUrl: [''],
      doctorSuggested: [false],
      location: [''],
      startTime: [''],
      monitoredBy: ['']
    });

    this.detailsForm = this.fb.group({
      instructions: this.fb.array([this.fb.control('')]), // removed Validators.required
      difficulty: ['Easy', Validators.required],
      recommendedStage: [[], atLeastOneStage],
      frequency: ['', Validators.required],
      supervision: ['', Validators.required],
      benefits: this.fb.array([this.fb.control('')]), // removed Validators.required
      precautions: this.fb.array([])
    });
    this.generateTimeOptions();
  }

  ngOnInit(): void {
    this.loadActivities();
  }

  // Helper to get form arrays
  get instructions(): FormArray {
    return this.detailsForm.get('instructions') as FormArray;
  }
  get benefits(): FormArray {
    return this.detailsForm.get('benefits') as FormArray;
  }
  get precautions(): FormArray {
    return this.detailsForm.get('precautions') as FormArray;
  }

  loadActivities(): void {
    this.activityService.getAllActivities().subscribe({
      next: (data) => {
        this.activities = data;
        this.loadAllDetails();
      },
      error: (err) => {
        console.error('Failed to load activities', err);
        this.toastr.error('Could not load activities');
      }
    });
  }

  loadAllDetails(): void {
    const requests = this.activities.map(activity =>
      this.activityService.getDetailsByActivityId(activity.id).toPromise()
        .then(details => ({ activity, details: details || [] }))
        .catch(() => ({ activity, details: [] }))
    );

    Promise.all(requests).then(results => {
      this.activitiesWithDetails = results.map(result => {
        const activity = result.activity;
        const details = result.details.length > 0 ? result.details[0] : null;
        return {
          ...activity,
          detailsId: details?.id,
          instructions: details?.instructions || [],
          difficulty: details?.difficulty || 'Easy',
          recommendedStage: details?.recommendedStage || [],
          frequency: details?.frequency || '',
          supervision: details?.supervision || '',
          benefits: details?.benefits || [],
          precautions: details?.precautions || [],
        };
      });
      if (this.activitiesWithDetails.length > 0) {
        this.selectActivity(this.activitiesWithDetails[0]);
      }
    }).catch(err => {
      console.error('Failed to load details', err);
      this.toastr.error('Could not load activity details');
    });
  }

  get pagedActivities(): ActivityWithDetails[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.activitiesWithDetails.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.activitiesWithDetails.length / this.pageSize) || 1);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  selectActivity(activity: ActivityWithDetails): void {
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
    }
    this.clickTimeout = setTimeout(() => {
      this._selectActivity(activity);
      this.clickTimeout = null;
    }, 200);
  }

  private _selectActivity(activity: ActivityWithDetails): void {
    this.selectedActivity = activity;
    this.formMode = 'edit';
    this.activityForm.patchValue(activity);
    this.detailsForm.patchValue({
      difficulty: activity.difficulty,
      recommendedStage: activity.recommendedStage,
      frequency: activity.frequency,
      supervision: activity.supervision
    });

    this.instructions.clear();
    activity.instructions.forEach(instr => 
      this.instructions.push(this.fb.group({ value: [instr] }))
    );
    this.benefits.clear();
    activity.benefits.forEach(ben => 
      this.benefits.push(this.fb.group({ value: [ben] }))
    );
    this.precautions.clear();
    (activity.precautions || []).forEach(pre => 
      this.precautions.push(this.fb.group({ value: [pre] }))
    );

    this.selectedDetails = {
      id: activity.detailsId || '',
      activityId: activity.id,
      instructions: activity.instructions,
      difficulty: activity.difficulty,
      recommendedStage: activity.recommendedStage,
      frequency: activity.frequency,
      supervision: activity.supervision,
      benefits: activity.benefits,
      precautions: activity.precautions || [],
    };
  }

  goToDetails(activity: ActivityWithDetails): void {
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
    this.router.navigate(['/admin/activities', activity.id], {
      state: { activity },
    });
  }

  startCreate(): void {
    this.formMode = 'create';
    this.activityForm.reset({
      name: '',
      type: 'Relaxation',
      duration: 10,
      scheduledTime: '',
      description: '',
      imageUrl: '',
      doctorSuggested: false,
      location: '',
      startTime: '',
      monitoredBy: ''
    });
    this.detailsForm.reset({
      difficulty: 'Easy',
      recommendedStage: [],
      frequency: '',
      supervision: ''
    });
    this.instructions.clear();
    this.instructions.push(this.fb.group({ value: [''] })); // no validator
    this.benefits.clear();
    this.benefits.push(this.fb.group({ value: [''] })); // no validator
    this.precautions.clear();
    this.selectedActivity = null;
    this.selectedDetails = null;
    this.selectedFile = null;
    this.imageChangedEvent = '';
    this.croppedImage = '';
  }

  addInstruction(): void {
    const newGroup = this.fb.group({ value: [''] }); // no validator
    this.instructions.push(newGroup);
    newGroup.markAsTouched();
  }

  removeInstruction(index: number): void {
    this.instructions.removeAt(index);
  }

  addBenefit(): void {
    this.benefits.push(this.fb.group({ value: [''] })); // no validator
  }

  removeBenefit(index: number): void {
    this.benefits.removeAt(index);
  }

  addPrecaution(): void {
    this.precautions.push(this.fb.group({ value: [''] })); // no validator
  }

  removePrecaution(index: number): void {
    this.precautions.removeAt(index);
  }

  toggleStage(stage: 'Early' | 'Moderate' | 'Advanced'): void {
    const current = this.detailsForm.get('recommendedStage')?.value || [];
    if (current.includes(stage)) {
      this.detailsForm.patchValue({ recommendedStage: current.filter((s: string) => s !== stage) });
    } else {
      this.detailsForm.patchValue({ recommendedStage: [...current, stage] });
    }
    this.detailsForm.get('recommendedStage')?.markAsTouched();
  }

  // --- Image cropper methods ---
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.toastr.warning('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.warning('File size must be less than 5MB');
        return;
      }
      // Store the event for the cropper
      this.imageChangedEvent = event;
      this.showCropper = true;
      // Clear any previously cropped image
      this.croppedImage = '';
      // Do NOT set selectedFile yet – we will set it after crop confirmation
    }
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.blob;
  }

  imageLoaded() {
    this.showCropper = true;
  }

  loadImageFailed() {
    this.toastr.error('Failed to load image');
  }

  cancelCrop(): void {
    this.showCropper = false;
    this.imageChangedEvent = '';
    this.croppedImage = '';
    this.selectedFile = null;
  }

  confirmCrop(): void {
    if (this.croppedImage) {
      // Preserve original file type if possible; default to jpeg
      const originalFile = this.imageChangedEvent?.target?.files[0];
      const fileType = originalFile?.type || 'image/jpeg';
      const fileExt = fileType === 'image/png' ? 'png' : 'jpg';
      const fileName = originalFile?.name || `cropped.${fileExt}`;

      const croppedFile = new File([this.croppedImage], fileName, { type: fileType });
      this.selectedFile = croppedFile;
      this.showCropper = false;
      this.imageChangedEvent = '';
      this.toastr.success('Image cropped successfully');
    } else {
      this.toastr.warning('Please crop the image first');
    }
  }

  saveActivity(): void {
    if (this.activityForm.invalid || this.detailsForm.invalid) {
      this.activityForm.markAllAsTouched();
      this.detailsForm.markAllAsTouched();
      this.toastr.warning('Please fix the errors in the form');
      return;
    }

    const activityValue = this.activityForm.value;
    const detailsValue = this.detailsForm.value;

    // Helper function to proceed with save after obtaining image URL
    const proceedWithSave = (imageUrl: string) => {
      const cleanedActivity: CreateActivityRequest | UpdateActivityRequest = {
        name: activityValue.name,
        type: activityValue.type,
        duration: activityValue.duration,
        scheduledTime: activityValue.scheduledTime || undefined,
        description: activityValue.description,
        imageUrl: imageUrl,
        doctorSuggested: activityValue.doctorSuggested,
        location: activityValue.location,
        startTime: activityValue.startTime,
        monitoredBy: activityValue.monitoredBy,
      };

      if (this.formMode === 'create') {
        this.activityService.createActivity(cleanedActivity as CreateActivityRequest).subscribe({
          next: (newActivity) => {
            const detailsRequest: CreateActivityDetailsRequest = {
              activityId: newActivity.id,
              instructions: detailsValue.instructions.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
              difficulty: detailsValue.difficulty,
              recommendedStage: detailsValue.recommendedStage,
              frequency: detailsValue.frequency,
              supervision: detailsValue.supervision,
              benefits: detailsValue.benefits.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
              precautions: detailsValue.precautions.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
            };
            this.activityService.createDetails(detailsRequest).subscribe({
              next: (newDetails) => {
                const combined: ActivityWithDetails = {
                  ...newActivity,
                  instructions: newDetails.instructions,
                  difficulty: newDetails.difficulty,
                  recommendedStage: newDetails.recommendedStage,
                  frequency: newDetails.frequency,
                  supervision: newDetails.supervision,
                  benefits: newDetails.benefits,
                  precautions: newDetails.precautions,
                };
                this.activitiesWithDetails = [...this.activitiesWithDetails, combined];
                this.selectActivity(combined);
                this.selectedFile = null; // reset file selection
                this.toastr.success('Activity created');
              },
              error: (err) => {
                console.error('Details creation failed', err);
                this.toastr.error('Activity created but details failed');
                this.selectedFile = null;
              }
            });
          },
          error: (err) => {
            console.error('Create failed', err);
            this.toastr.error('Creation failed');
            this.selectedFile = null;
          }
        });
      } else {
        if (!this.selectedActivity) return;
        this.activityService.updateActivity(this.selectedActivity.id, cleanedActivity).subscribe({
          next: (updatedActivity) => {
            const detailsRequest: UpdateActivityDetailsRequest = {
              instructions: detailsValue.instructions.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
              difficulty: detailsValue.difficulty,
              recommendedStage: detailsValue.recommendedStage,
              frequency: detailsValue.frequency,
              supervision: detailsValue.supervision,
              benefits: detailsValue.benefits.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
              precautions: detailsValue.precautions.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
            };
            if (this.selectedDetails?.id) {
              this.activityService.updateDetails(this.selectedDetails.id, detailsRequest).subscribe({
                next: (updatedDetails) => {
                  this.updateLocal(updatedActivity, updatedDetails);
                  this.selectedFile = null;
                  this.toastr.success('Activity updated');
                },
                error: (err) => {
                  console.error('Details update failed', err);
                  this.updateLocal(updatedActivity, null);
                  this.selectedFile = null;
                  this.toastr.warning('Activity updated but details failed');
                }
              });
            } else {
              const createReq: CreateActivityDetailsRequest = {
                activityId: updatedActivity.id,
                ...detailsRequest as any,
              };
              this.activityService.createDetails(createReq).subscribe({
                next: (newDetails) => {
                  this.updateLocal(updatedActivity, newDetails);
                  this.selectedFile = null;
                  this.toastr.success('Activity updated and details created');
                },
                error: (err) => {
                  console.error('Details creation failed', err);
                  this.updateLocal(updatedActivity, null);
                  this.selectedFile = null;
                  this.toastr.warning('Activity updated but details creation failed');
                }
              });
            }
          },
          error: (err) => {
            console.error('Update failed', err);
            this.toastr.error('Update failed');
            this.selectedFile = null;
          }
        });
      }
    };

    // If a new file is selected, upload it first
    if (this.selectedFile) {
      this.activityService.uploadImage(this.selectedFile).subscribe({
        next: (imageUrl) => {
          proceedWithSave(imageUrl);
        },
        error: (err) => {
          console.error('Image upload failed', err);
          this.toastr.error('Image upload failed, activity not saved');
          this.selectedFile = null;
        }
      });
    } else {
      // No new file: use the existing imageUrl from form
      proceedWithSave(activityValue.imageUrl);
    }
  }

  private updateLocal(updatedActivity: Activity, updatedDetails: ActivityDetails | null): void {
    const index = this.activitiesWithDetails.findIndex(a => a.id === updatedActivity.id);
    if (index !== -1) {
      const existing = this.activitiesWithDetails[index];
      const combined: ActivityWithDetails = {
        ...updatedActivity,
        instructions: updatedDetails?.instructions || existing.instructions,
        difficulty: updatedDetails?.difficulty || existing.difficulty,
        recommendedStage: updatedDetails?.recommendedStage || existing.recommendedStage,
        frequency: updatedDetails?.frequency || existing.frequency,
        supervision: updatedDetails?.supervision || existing.supervision,
        benefits: updatedDetails?.benefits || existing.benefits,
        precautions: updatedDetails?.precautions || existing.precautions,
      };
      this.activitiesWithDetails[index] = combined;
      this.selectedActivity = combined;
      this.selectedDetails = updatedDetails || { ...combined } as any;

      // Update the activity form
      this.activityForm.patchValue(updatedActivity);

      // Update the details form (non-array fields)
      this.detailsForm.patchValue({
        difficulty: combined.difficulty,
        recommendedStage: combined.recommendedStage,
        frequency: combined.frequency,
        supervision: combined.supervision
      });

      // Rebuild instructions array with FormGroup { value: [...] } no validator
      this.instructions.clear();
      combined.instructions.forEach(instr => 
        this.instructions.push(this.fb.group({ value: [instr] }))
      );

      // Rebuild benefits array with FormGroup
      this.benefits.clear();
      combined.benefits.forEach(ben => 
        this.benefits.push(this.fb.group({ value: [ben] }))
      );

      // Rebuild precautions array with FormGroup
      this.precautions.clear();
      (combined.precautions || []).forEach(pre => 
        this.precautions.push(this.fb.group({ value: [pre] }))
      );
    }
  }

  deleteCurrentActivity(): void {
    if (!this.selectedActivity) return;
    this.deleteActivity(this.selectedActivity);
  }

  deleteActivity(activity: ActivityWithDetails): void {
    if (!confirm(`Delete "${activity.name}"?`)) return;
    this.activityService.deleteActivity(activity.id).subscribe({
      next: () => {
        this.activitiesWithDetails = this.activitiesWithDetails.filter(a => a.id !== activity.id);
        if (this.selectedActivity?.id === activity.id) {
          this.selectedActivity = this.activitiesWithDetails[0] || null;
          if (this.selectedActivity) {
            this.selectActivity(this.selectedActivity);
          } else {
            this.startCreate();
          }
        }
        this.toastr.success('Activity deleted');
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.toastr.error('Delete failed');
      }
    });
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  private generateTimeOptions(): void {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour % 12 || 12;
        const displayMinute = minute.toString().padStart(2, '0');
        times.push(`${displayHour}:${displayMinute} ${period}`);
      }
    }
    this.timeOptions = times;
  }

  incrementDuration(): void {
    const current = this.activityForm.get('duration')?.value || 10;
    if (current < 480) {
      this.activityForm.patchValue({ duration: current + 5 });
    }
  }

  decrementDuration(): void {
    const current = this.activityForm.get('duration')?.value || 10;
    if (current > 1) {
      this.activityForm.patchValue({ duration: current - 5 });
    }
  }

  getImageUrl(relativePath: string): string {
    if (!relativePath) return '/assets/logo.png';
    if (relativePath.startsWith('http')) return relativePath;
    return `${this.activityService.apiUrl}${relativePath}`;
  }
}