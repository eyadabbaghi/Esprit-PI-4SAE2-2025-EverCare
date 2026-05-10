package tn.esprit.user.dto;

import lombok.Data;
import tn.esprit.user.entity.UserRole;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@Data
public class UserDto {
    private String userId;
    private String name;
    private String email;
    private UserRole role;
    private String phone;
    private String recoveryEmail;
    private String address;
    private String country;
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
    private Map<String, String> caregiverRelationships;
    private Map<String, String> patientRelationships;
    private String doctorEmail;// for caregiver
    private Set<String> doctorEmails;


    private String keycloakId;
}
