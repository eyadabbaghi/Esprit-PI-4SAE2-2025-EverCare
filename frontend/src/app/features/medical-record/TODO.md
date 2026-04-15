# Integration Assessment with Medical Record Flow - Approved Plan

## Steps (from approved plan):

- [x] Step 1: Update MedicalRecordListComponent to redirect to assessment if no record for patient
  - File: frontend/src/app/features/medical-record/pages/medical-record-list/medical-record-list.component.ts
  - Replace ensureOwnRecord() call with router.navigate(['/assessment'])

- [x] Step 2: Update AssessmentFormComponent to create medical record after assessment submit
  - File: frontend/src/app/features/medical-record/pages/assessment-form/assessment-form.component.ts
  - After assessmentService.create success, call medicalRecordService.autoCreate({patientId, alzheimerStage: previewStage})
  - Navigate to '/medical-record'

## Follow-up:
- cd frontend && ng serve
- Login as new patient -> test /medical-record -> assessment -> submit -> back to record

