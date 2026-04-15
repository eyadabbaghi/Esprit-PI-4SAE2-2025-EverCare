# Quick Reference: Caregiver-Patient Endpoints

**Date:** April 2, 2026 | **Status:** ✅ Ready for Team Use

---

## 🎯 Quick Summary

4 new endpoints added to retrieve caregiver-patient relationships in the User microservice.

---

## 📋 Endpoints Overview

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|----------------|
| `/users/{userId}/caregivers` | GET | Get caregivers for patient (by ID) | ❌ No |
| `/users/caregivers` | GET | Get caregivers for authenticated patient | ✅ Yes |
| `/users/{userId}/patients` | GET | Get patients for caregiver (by ID) | ❌ No |
| (Future) `/users/patients` | GET | Get patients for authenticated caregiver | ✅ Yes |

---

## 🚀 Usage Examples

### 1️⃣ Get Caregivers for a Patient (by ID)
```bash
GET /users/550e8400-e29b-41d4-a716-446655440000/caregivers
```
✅ **Response:**
```json
{
  "caregivers": [
    {
      "userId": "...",
      "name": "John Caregiver",
      "email": "john@example.com",
      "role": "CAREGIVER",
      "patientEmails": ["patient1@example.com"]
    }
  ]
}
```

### 2️⃣ Get My Caregivers (As Patient)
```bash
GET /users/caregivers
Authorization: Bearer <jwt_token>
```
✅ **Same response as above**

### 3️⃣ Get Patients for a Caregiver (by ID)
```bash
GET /users/6ba7b810-9dad-11d1-80b4-00c04fd430c8/patients
```
✅ **Response:**
```json
{
  "patients": [
    {
      "userId": "...",
      "name": "Jane Patient",
      "email": "jane@example.com",
      "role": "PATIENT",
      "caregiverEmails": ["caregiver@example.com"],
      "doctorEmail": "doctor@hospital.com"
    }
  ]
}
```

---

## ❌ Error Responses

All endpoints return 404 if:
- User ID/email doesn't exist
- User has wrong role (e.g., fetching caregivers for a non-patient)

```json
{
  "message": "User with ID ... is not a patient"
}
```

---

## 🔧 Service Methods

### For Service Layer Use:

```java
// By ID
userService.getCaregiversByPatientId(String patientId)
userService.getPatientsByCaregiveId(String caregiverId)

// By Email
userService.getCaregiversByPatientEmail(String email)
userService.getPatientsByCaregiveEmail(String email)
```

**All return:** `List<UserDto>`

---

## 📝 Implementation Details

| Aspect | Detail |
|--------|--------|
| **Files Modified** | UserController.java, UserService.java |
| **Lines Added** | ~150 lines (code + comments) |
| **Database Tables** | No new tables (uses existing `patient_caregiver`) |
| **Performance** | Read-only transactions, optimized queries |
| **Breaking Changes** | None ✅ |

---

## 🔗 How Relationships Are Created

Use the existing update endpoint to connect patients and caregivers:

```bash
PUT /users/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "connectedEmail": "caregiver@example.com"
}
```

---

## 💡 Key Points for Team

1. ✅ All changes have detailed JavaDoc comments
2. ✅ Full changelog available in `CHANGELOG_CAREGIVER_FETCH.md`
3. ✅ No database migrations needed
4. ✅ Backward compatible with existing code
5. ✅ Ready for integration testing

---

## 📚 Documentation Files

- **API Guide:** `CAREGIVER_FETCH_GUIDE.md` (detailed with examples)
- **Changelog:** `CHANGELOG_CAREGIVER_FETCH.md` (team collaboration details)
- **Code Comments:** Inline in UserController.java and UserService.java

---

## ✨ Code Quality

- 📌 Transactional annotations for consistency
- 🛡️ Role validation on all endpoints
- 🔐 Security with JWT where needed
- 📊 Proper error handling with meaningful messages
- 📖 Comprehensive JavaDoc comments

---

**Questions or Issues?** Check the inline code comments or reach out to the team lead.

---

Last Updated: April 2, 2026

