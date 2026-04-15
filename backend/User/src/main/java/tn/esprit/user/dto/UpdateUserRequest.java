package tn.esprit.user.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateUserRequest {
    private String name;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private String emergencyContact;
    private String profilePicture;

    // Doctor fields
    private Integer yearsExperience;
    private String specialization;
    private String medicalLicense;
    private String workplaceType;
    private String workplaceName;

    // For patient/caregiver: email of the other party
    private String connectedEmail;
    private String doctorEmail;
}