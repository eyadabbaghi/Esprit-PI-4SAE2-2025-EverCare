# Medical Record + Assessment Frontend

## Routes
- `/assessment`: patient screening form
- `/assessment/report/:id`: generated assessment report
- `/doctor/reports`: doctor/admin paginated report list with filters
- `/medical-record`: medical record list
- `/medical-record/new`: medical record create
- `/medical-record/:id`: medical record details (history + documents)
- `/medical-record/:id/edit`: medical record edit

## API Base URL
- The services read `medicalRecordApiUrl` from:
  - `src/environments/environment.ts`
  - `src/environments/environment.development.ts`
- `AssessmentService` derives `/api/assessments` from this base.

## Main Services
- `services/assessment.service.ts`
- `services/medical-record.service.ts`
- `services/medical-history.service.ts`
- `services/medical-document.service.ts`

## Notes
- Assessment report page includes disclaimer:
  - `Ce rapport est une évaluation préliminaire et ne remplace pas un diagnostic médical.`
- Role behavior:
  - caregiver: stage edit disabled in record form
  - doctor/admin: full assessment + dossier actions
