package tn.esprit.alerts.dto;

import lombok.Data;
import tn.esprit.alerts.entity.UserRole;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Data
public class UserDto {
    private String userId;
    private String name;
    private String email;
    private UserRole role;
    private String phone;
    private boolean isVerified;
    private LocalDateTime createdAt;

    // Common profile fields
    private LocalDate dateOfBirth;
    private String emergencyContact;
    private String profilePicture;

    // Doctor fields
    private Integer yearsExperience;
    private String specialization;
    private String medicalLicense;
    private String workplaceType;
    private String workplaceName;

    // Relationship fields (emails of connected users)
    private Set<String> caregiverEmails;   // for patient
    private Set<String> patientEmails;
    private String doctorEmail; // for caregiver
}