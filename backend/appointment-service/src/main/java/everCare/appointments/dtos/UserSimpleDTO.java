/**
 * UserSimpleDTO - DTO for user data received from User microservice via Feign.
 * 
 * CHANGED: Used to map User entity locally, now used to receive data from User microservice.
 * Fields match the UserDto from the User microservice.
 */
package everCare.appointments.dtos;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class UserSimpleDTO {
    private String userId;
    private String keycloakId;
    private String name;
    private String email;
    private String role;
    private String phone;
    private boolean verified;
    private LocalDateTime createdAt;
    private LocalDate dateOfBirth;
    private String emergencyContact;
    private String profilePicture;
    
    // Doctor-specific fields
    private Integer yearsExperience;
    private String specialization;
    private String medicalLicense;
    private String workplaceType;
    private String workplaceName;
    private String doctorEmail;
    
    // Relationship emails (for patients/caregivers)
    private java.util.Set<String> caregiverEmails;
    private java.util.Set<String> patientEmails;
}