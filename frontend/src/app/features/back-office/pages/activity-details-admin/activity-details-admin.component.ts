import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ActivityService, Activity, ActivityDetails, UpdateActivityRequest, UpdateActivityDetailsRequest } from '../../../../core/services/activity.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';

// Custom validator: at least one stage selected
function atLeastOneStage(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value || value.length === 0) {
    return { atLeastOneStage: true };
  }
  return null;
}

@Component({
  selector: 'app-activity-details-admin',
  templateUrl: './activity-details-admin.component.html',
  styleUrls: ['./activity-details-admin.component.css'],
})
export class ActivityDetailsAdminComponent implements OnInit {
  activity: Activity | null = null;
  details: ActivityDetails | null = null;
  isEditing = false;
  Math = Math;

  activityForm: FormGroup;
  detailsForm: FormGroup;

  stages: ('Early' | 'Moderate' | 'Advanced')[] = ['Early', 'Moderate', 'Advanced'];
  difficultyLevels: ('Easy' | 'Moderate' | 'Challenging')[] = ['Easy', 'Moderate', 'Challenging'];
  activityTypes = ['Relaxation', 'Cognitive', 'Physical', 'Social', 'Creative'];

  // Image upload & cropper
  selectedFile: File | null = null;
  imageChangedEvent: any = '';
  croppedImage: any = '';
  showCropper = false;

  constructor(
    private fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private activityService: ActivityService,
    private toastr: ToastrService
  ) {
    this.activityForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      type: ['', Validators.required],
      duration: [0, [Validators.required, Validators.min(1), Validators.max(480)]],
      scheduledTime: [''],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      imageUrl: [''],
      doctorSuggested: [false],
      location: [''],
      startTime: [''],
      monitoredBy: ['']
    });

    this.detailsForm = this.fb.group({
      instructions: this.fb.array([]),
      difficulty: ['', Validators.required],
      recommendedStage: [[], atLeastOneStage],
      frequency: ['', Validators.required],
      supervision: ['', Validators.required],
      benefits: this.fb.array([]),
      precautions: this.fb.array([])
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/activities']);
      return;
    }
    this.loadActivity(id);
  }

  get instructions(): FormArray {
    return this.detailsForm.get('instructions') as FormArray;
  }
  get benefits(): FormArray {
    return this.detailsForm.get('benefits') as FormArray;
  }
  get precautions(): FormArray {
    return this.detailsForm.get('precautions') as FormArray;
  }

  loadActivity(id: string): void {
    this.activityService.getActivityById(id).subscribe({
      next: (activity) => {
        this.activity = activity;
        this.activityForm.patchValue(activity);
        this.loadDetails(id);
      },
      error: (err) => {
        console.error('Failed to load activity', err);
        this.toastr.error('Activity not found');
        this.router.navigate(['/admin/activities']);
      }
    });
  }

  loadDetails(activityId: string): void {
    this.activityService.getDetailsByActivityId(activityId).subscribe({
      next: (details) => {
        this.details = details.length > 0 ? details[0] : null;
        if (this.details) {
          this.detailsForm.patchValue({
            difficulty: this.details.difficulty,
            recommendedStage: this.details.recommendedStage,
            frequency: this.details.frequency,
            supervision: this.details.supervision
          });
          // Fill form arrays
          this.instructions.clear();
          this.details.instructions.forEach(instr => 
            this.instructions.push(this.fb.group({ value: [instr, Validators.required] }))
          );
          this.benefits.clear();
          this.details.benefits.forEach(ben => 
            this.benefits.push(this.fb.group({ value: [ben, Validators.required] }))
          );
          this.precautions.clear();
          (this.details.precautions || []).forEach(pre => 
            this.precautions.push(this.fb.group({ value: [pre, Validators.required] }))
          );
        }
        this.isEditing = false;
      },
      error: (err) => console.error('Failed to load details', err)
    });
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  addInstruction(): void {
    this.instructions.push(this.fb.group({ value: ['', Validators.required] }));
  }

  removeInstruction(index: number): void {
    this.instructions.removeAt(index);
  }

  addBenefit(): void {
    this.benefits.push(this.fb.group({ value: ['', Validators.required] }));
  }

  removeBenefit(index: number): void {
    this.benefits.removeAt(index);
  }

  addPrecaution(): void {
    this.precautions.push(this.fb.group({ value: ['', Validators.required] }));
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

  // Image cropper methods
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

  save(): void {
    if (!this.activity) return;

    if (this.activityForm.invalid || this.detailsForm.invalid) {
      this.activityForm.markAllAsTouched();
      this.detailsForm.markAllAsTouched();
      this.toastr.warning('Please fix the errors in the form');
      return;
    }

    const activityValue = this.activityForm.value;
    const detailsValue = this.detailsForm.value;

    const proceedWithSave = (imageUrl: string) => {
      const activityUpdate: UpdateActivityRequest = {
        name: activityValue.name,
        type: activityValue.type,
        duration: activityValue.duration,
        scheduledTime: activityValue.scheduledTime,
        description: activityValue.description,
        imageUrl: imageUrl,
        doctorSuggested: activityValue.doctorSuggested,
        location: activityValue.location,
        startTime: activityValue.startTime,
        monitoredBy: activityValue.monitoredBy,
      };

      this.activityService.updateActivity(this.activity!.id, activityUpdate).subscribe({
        next: (updatedActivity) => {
          this.activity = updatedActivity;
          if (this.details) {
            const detailsUpdate: UpdateActivityDetailsRequest = {
              instructions: detailsValue.instructions.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
              difficulty: detailsValue.difficulty,
              recommendedStage: detailsValue.recommendedStage,
              frequency: detailsValue.frequency,
              supervision: detailsValue.supervision,
              benefits: detailsValue.benefits.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
              precautions: detailsValue.precautions.map((g: any) => g.value).filter((s: string) => s.trim().length > 0),
            };
            this.activityService.updateDetails(this.details.id, detailsUpdate).subscribe({
              next: (updatedDetails) => {
                this.details = updatedDetails;
                this.isEditing = false;
                this.selectedFile = null;
                this.toastr.success('Activity updated');
              },
              error: (err) => {
                console.error('Details update failed', err);
                this.toastr.warning('Activity updated but details failed');
                this.isEditing = false;
                this.selectedFile = null;
              }
            });
          } else {
            this.isEditing = false;
            this.selectedFile = null;
            this.toastr.success('Activity updated');
          }
        },
        error: (err) => {
          console.error('Update failed', err);
          this.toastr.error('Update failed');
          this.selectedFile = null;
        }
      });
    };

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
      proceedWithSave(this.activity.imageUrl);
    }
  }

  deleteAndBack(): void {
    if (!this.activity) return;
    if (!confirm('Delete this activity?')) return;
    this.activityService.deleteActivity(this.activity.id).subscribe({
      next: () => {
        this.toastr.success('Activity deleted');
        this.router.navigate(['/admin/activities']);
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.toastr.error('Delete failed');
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/admin/activities']);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  getImageUrl(relativePath: string): string {
    if (!relativePath) return '/assets/logo.png';
    if (relativePath.startsWith('http')) return relativePath;
    return `${this.activityService.apiUrl}${relativePath}`;
  }
}