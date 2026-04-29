# Changelog: Caregiver-Patient Relationship Endpoints

**Date Added:** April 2, 2026  
**Developer:** [Team Member Name]  
**Status:** Ready for Testing  
**Microservice:** User Service

---

## Overview

Added comprehensive endpoints and service methods to fetch caregiver-patient relationships in the User microservice. These additions enable bidirectional queries to retrieve all caregivers for a patient and all patients for a caregiver.

## Files Modified

### 1. UserController.java
**Location:** `src/main/java/tn/esprit/user/controller/UserController.java`

#### Added Endpoints:

##### Endpoint 1: Get Caregivers for Patient (by ID)
```java
@GetMapping("/{userId}/caregivers")
public ResponseEntity<?> getCaregiversByUserId(@PathVariable String userId)
```
- **Lines Added:** 165-191
- **Purpose:** Retrieve all caregivers assigned to a specific patient
- **HTTP Method:** GET
- **URL Pattern:** `/users/{userId}/caregivers`
- **Path Variable:** `userId` - Patient's unique identifier (UUID)
- **Response:** `{"caregivers": [UserDto, UserDto, ...]}`
- **Status Codes:** 
  - 200 OK: Success
  - 404 NOT_FOUND: User doesn't exist or is not a patient

##### Endpoint 2: Get My Caregivers (Authenticated Patient)
```java
@GetMapping("/caregivers")
public ResponseEntity<?> getMyCaregiversFromAuth(@AuthenticationPrincipal UserDetails userDetails)
```
- **Lines Added:** 193-218
- **Purpose:** Retrieve caregivers for the authenticated patient using JWT token
- **HTTP Method:** GET
- **URL Pattern:** `/users/caregivers`
- **Authentication:** Required (JWT Bearer Token)
- **Response:** `{"caregivers": [UserDto, UserDto, ...]}`
- **Status Codes:**
  - 200 OK: Success
  - 404 NOT_FOUND: User is not a patient

##### Endpoint 3: Get Patients for Caregiver (by ID)
```java
@GetMapping("/{userId}/patients")
public ResponseEntity<?> getPatientsByCaregiverId(@PathVariable String userId)
```
- **Lines Added:** 220-244
- **Purpose:** Retrieve all patients assigned to a specific caregiver
- **HTTP Method:** GET
- **URL Pattern:** `/users/{userId}/patients`
- **Path Variable:** `userId` - Caregiver's unique identifier (UUID)
- **Response:** `{"patients": [UserDto, UserDto, ...]}`
- **Status Codes:**
  - 200 OK: Success
  - 404 NOT_FOUND: User doesn't exist or is not a caregiver

---

### 2. UserService.java
**Location:** `src/main/java/tn/esprit/user/service/UserService.java`

#### Added Service Methods:

##### Method 1: getCaregiversByPatientId()
```java
@Transactional(readOnly = true)
public List<UserDto> getCaregiversByPatientId(String patientId)
```
- **Lines Added:** 305-317
- **Purpose:** Fetch caregivers by patient's UUID
- **Parameter:** `patientId` - Patient's unique identifier
- **Returns:** `List<UserDto>` - List of caregiver DTOs
- **Throws:** `RuntimeException` if user not found or not a PATIENT
- **Transaction:** Read-only (optimized for queries)
- **Validation:** Checks user role is PATIENT

##### Method 2: getCaregiversByPatientEmail()
```java
@Transactional(readOnly = true)
public List<UserDto> getCaregiversByPatientEmail(String patientEmail)
```
- **Lines Added:** 336-349
- **Purpose:** Fetch caregivers by patient's email (for authenticated users)
- **Parameter:** `patientEmail` - Patient's email address
- **Returns:** `List<UserDto>` - List of caregiver DTOs
- **Throws:** `RuntimeException` if user not found or not a PATIENT
- **Transaction:** Read-only (optimized for queries)
- **Validation:** Checks user role is PATIENT
- **Security Note:** Called from controller with `@AuthenticationPrincipal`

##### Method 3: getPatientsByCaregiveId()
```java
@Transactional(readOnly = true)
public List<UserDto> getPatientsByCaregiveId(String caregiverId)
```
- **Lines Added:** 367-379
- **Purpose:** Fetch patients by caregiver's UUID
- **Parameter:** `caregiverId` - Caregiver's unique identifier
- **Returns:** `List<UserDto>` - List of patient DTOs
- **Throws:** `RuntimeException` if user not found or not a CAREGIVER
- **Transaction:** Read-only (optimized for queries)
- **Validation:** Checks user role is CAREGIVER

##### Method 4: getPatientsByCaregiveEmail()
```java
@Transactional(readOnly = true)
public List<UserDto> getPatientsByCaregiveEmail(String caregiverEmail)
```
- **Lines Added:** 398-411
- **Purpose:** Fetch patients by caregiver's email (for authenticated users)
- **Parameter:** `caregiverEmail` - Caregiver's email address
- **Returns:** `List<UserDto>` - List of patient DTOs
- **Throws:** `RuntimeException` if user not found or not a CAREGIVER
- **Transaction:** Read-only (optimized for queries)
- **Validation:** Checks user role is CAREGIVER
- **Security Note:** Called from controller with `@AuthenticationPrincipal`

---

## Technical Details

### Database Schema
The implementation leverages the existing many-to-many relationship defined in the User entity:

```java
@ManyToMany
@JoinTable(
    name = "patient_caregiver",
    joinColumns = @JoinColumn(name = "patient_id"),
    inverseJoinColumns = @JoinColumn(name = "caregiver_id")
)
private Set<User> caregivers = new HashSet<>();

@ManyToMany(mappedBy = "caregivers")
private Set<User> patients = new HashSet<>();
```

**Junction Table:** `patient_caregiver`
- `patient_id` - Foreign key to patients table (User table)
- `caregiver_id` - Foreign key to caregivers table (User table)

### Data Flow

1. **Request comes in** → UserController endpoint
2. **Endpoint calls** → UserService method
3. **Service validates** → User role (PATIENT or CAREGIVER)
4. **Service retrieves** → Relationship data from User entity
5. **Maps to DTOs** → Using existing `mapToDto()` method
6. **Returns response** → As JSON wrapped in Map

### DTO Information

The returned `UserDto` includes:
- Basic info: `userId`, `name`, `email`, `role`, `phone`
- Status: `isVerified`, `createdAt`
- Profile: `dateOfBirth`, `emergencyContact`, `profilePicture`
- Relationships: `caregiverEmails` (for patients), `patientEmails` (for caregivers)

---

## How to Establish Relationships

Before using these endpoints, caregivers and patients must be connected using the existing update endpoint:

```http
PUT /users/profile
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "connectedEmail": "caregiver@example.com"
}
```

**For a Patient:**
- Adds the caregiver to the patient's `caregivers` set
- Adds the patient to the caregiver's `patients` set

**For a Caregiver:**
- Adds the patient to the caregiver's `patients` set
- Adds the caregiver to the patient's `caregivers` set

---

## Testing

### Example API Calls

#### 1. Get caregivers for a patient (by ID)
```bash
curl -X GET "http://localhost:8080/users/550e8400-e29b-41d4-a716-446655440000/caregivers"
```

#### 2. Get my caregivers (authenticated)
```bash
curl -X GET "http://localhost:8080/users/caregivers" \
  -H "Authorization: Bearer <jwt_token>"
```

#### 3. Get patients for a caregiver (by ID)
```bash
curl -X GET "http://localhost:8080/users/6ba7b810-9dad-11d1-80b4-00c04fd430c8/patients"
```

### Expected Response Examples

**Success (200 OK):**
```json
{
  "caregivers": [
    {
      "userId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "John Caregiver",
      "email": "john@example.com",
      "role": "CAREGIVER",
      "phone": "+1234567890",
      "isVerified": true,
      "dateOfBirth": "1985-05-15",
      "profilePicture": "url/to/picture",
      "patientEmails": ["patient1@example.com", "patient2@example.com"]
    }
  ]
}
```

**Error (404 NOT_FOUND):**
```json
{
  "message": "User with ID 550e8400-e29b-41d4-a716-446655440000 is not a patient"
}
```

---

## Performance Considerations

1. **Read-Only Transactions:** All methods use `@Transactional(readOnly = true)` for:
   - Better performance (read-only optimization)
   - Clear intent
   - Protection against accidental writes

2. **Lazy vs Eager Loading:** The User entity's caregivers/patients relationships are:
   - Default: Lazy loaded (but accessed in service layer)
   - Transaction scope ensures proper loading within service method

3. **N+1 Query Prevention:**
   - Single database access per method (reads the entire caregivers/patients collection)
   - DTO mapping happens in Java (no additional DB queries)

---

## Breaking Changes

**None** - This is a pure addition of new endpoints and methods. No existing functionality was modified.

---

## Future Enhancements

Consider implementing:
1. Pagination for large caregiver/patient lists
2. Filtering and sorting options
3. Bulk disconnect endpoints
4. Activity logging for relationship changes

---

## Team Notes

- **Code Review:** Please review comments in UserController and UserService for implementation details
- **Testing Priority:** Test with multiple patients/caregivers to ensure relationship integrity
- **Documentation:** See `CAREGIVER_FETCH_GUIDE.md` for comprehensive API documentation
- **Questions?** Refer to the inline JavaDoc comments in the code

---

## Sign-Off

✅ All endpoints implemented and documented  
✅ Comments added for team clarity  
✅ Ready for testing and integration  

**Last Updated:** April 2, 2026

