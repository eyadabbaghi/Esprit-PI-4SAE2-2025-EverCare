# medical-record-service

## Implemented Rules
- Unique medical record per `patientId` (DB + service check)
- `POST /api/medical-records/auto-create` is idempotent
- Archive (soft delete): `DELETE` sets `active=false`
- Archived records cannot be updated, and cannot mutate history/documents
- Alzheimer stage transition only forward: `EARLY -> MIDDLE -> LATE`
- History date cannot be in the future and is listed by date desc
- Document upload validation:
  - Allowed: `pdf`, `png`, `jpg`, `jpeg`
  - Max size: `5MB`
- Document download endpoint streams stored files

## Main Endpoints
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
- `POST /api/medical-records/{recordId}/documents` (multipart)
- `GET /api/medical-records/{recordId}/documents/{docId}/download`
- `DELETE /api/medical-records/{recordId}/documents/{docId}`

## Run
1. Ensure MySQL is available (see `src/main/resources/application.properties`).
2. From `backend/medical-record-service/` run:
   - `./mvnw spring-boot:run` (Linux/macOS)
   - `mvnw.cmd spring-boot:run` (Windows)

## Test
- `mvn clean test`
- Tests use H2 in-memory DB via `src/test/resources/application-test.properties`.
