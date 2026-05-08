/**
 * UserRole - Enum for user roles in the system.
 * 
 * CHANGED: Moved from User entity to separate enum file.
 * This is used for access control throughout the appointment service.
 */
package everCare.appointments.entities;

public enum UserRole {
    PATIENT,
    DOCTOR,
    CAREGIVER,
    ADMIN
}
