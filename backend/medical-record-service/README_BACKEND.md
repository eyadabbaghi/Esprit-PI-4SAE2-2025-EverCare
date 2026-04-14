# Medical Record Service - Backend Notes

## New Assessment Workflow

### Create assessment report
- `POST /api/assessments`
- Body example:
```json
{
  "patientId": "patient-123",
  "patientName": "John Doe",
  "caregiverName": "Jane Doe",
  "answers": {
    "memory_recent": 2,
    "orientation_time": 1,
    "orientation_place": 1,
    "language_difficulty": 2,
    "daily_activities": 1,
    "mood_changes": 2,
    "attention_loss": 1,
    "caregiver_burden": 2
  }
}
```

### Report list by patient
- `GET /api/assessments/patient/{patientId}`

### Paginated reports (doctor/admin)
- `GET /api/assessments?page=0&size=10&stage=EARLY&fromDate=2026-01-01&toDate=2026-12-31&query=john`

### Report details
- `GET /api/assessments/{id}`

### PDF placeholder download
- `GET /api/assessments/{id}/pdf`

### Doctor note patch
- `PATCH /api/assessments/{id}/doctor-note`
- Body:
```json
{
  "note": "Follow-up consultation required."
}
```

### Alerted reports list (legacy view for existing frontend)
- `GET /api/assessments/alerts?page=0&size=10`

### Clinical alerts engine (new)
- `GET /api/alerts?page=0&size=10&status=OPEN`
- `PATCH /api/alerts/{id}/ack`
- `PATCH /api/alerts/{id}/resolve`

## Business rules implemented
- Medical record auto-create idempotent during assessment creation.
- Score to stage:
  - `0-7 => EARLY`
  - `8-14 => MIDDLE`
  - `15+ => LATE`
- Stage downgrade is not auto-applied to medical record.
- Clinical alert is auto-created (`OPEN`) when one of these rules is true:
  - `score >= 15`
  - `computedStage == LATE`
  - rapid worsening: score increase `>= 4` within `30` days
  - no follow-up: last assessment older than `45` days
- Alert lifecycle:
  - `OPEN -> ACK -> RESOLVED`
  - when resolved, linked report `needsAttention=false`
- Report soft delete: `DELETE /api/assessments/{id}` sets `active=false`.
- Additional advanced rules (without new entity):
  - assessment anti-spam: minimum `30` minutes between two submissions for the same patient (`429 Too Many Requests`)
  - medical record archive guard: cannot archive if active `needsAttention=true` reports still exist
  - history anti-duplicate: same `(type, date, description)` cannot be inserted twice for the same dossier
  - documents constraints:
    - max `20` documents per dossier
    - duplicate file name (case-insensitive) forbidden per dossier
  - emergency contact policy:
    - `name` and `phone` must be provided together
    - both are required when stage is `MIDDLE` or `LATE`

## Existing medical record endpoints
- `POST /api/medical-records`
- `POST /api/medical-records/auto-create`
- `GET /api/medical-records/{id}`
- `GET /api/medical-records/patient/{patientId}`
- `GET /api/medical-records?page=0&size=10&active=true`
- `PUT /api/medical-records/{id}`
- `DELETE /api/medical-records/{id}` (archive)

## Quick Postman flow
1. `POST /api/assessments`
2. Copy `id` from response.
3. `GET /api/assessments/{id}`
4. `GET /api/medical-records/patient/{patientId}`
5. `PATCH /api/assessments/{id}/doctor-note`
6. `GET /api/alerts?page=0&size=10&status=OPEN`
7. `PATCH /api/alerts/{alertId}/ack`
8. `PATCH /api/alerts/{alertId}/resolve`
