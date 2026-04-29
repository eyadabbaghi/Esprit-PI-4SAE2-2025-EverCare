# Medical Record Feature

## Routes
- `/medical-record`: paginated list + patient search + archive action
- `/medical-record/new`: create form (supports idempotent auto-create)
- `/medical-record/:id`: details page with History + Documents
- `/medical-record/:id/edit`: edit form

## Backend API Used
- `POST /api/medical-records`
- `POST /api/medical-records/auto-create`
- `GET /api/medical-records/{id}`
- `GET /api/medical-records/patient/{patientId}`
- `GET /api/medical-records?page=0&size=10&active=true`
- `PUT /api/medical-records/{id}`
- `DELETE /api/medical-records/{id}`
- `GET /api/medical-records/{recordId}/history`
- `POST /api/medical-records/{recordId}/history`
- `DELETE /api/medical-records/{recordId}/history/{historyId}`
- `GET /api/medical-records/{recordId}/documents`
- `POST /api/medical-records/{recordId}/documents` (multipart `file`)
- `GET /api/medical-records/{recordId}/documents/{docId}/download`
- `DELETE /api/medical-records/{recordId}/documents/{docId}`

## API Base URL
- Configured in `src/environments/environment.ts` as `medicalRecordApiUrl`.
- Update this value if your API Gateway route or service URL changes.

## Run
1. Start backend medical-record-service.
2. From `frontend/`, run `npm install` (if needed).
3. Run `ng serve` (or `npm start`).
