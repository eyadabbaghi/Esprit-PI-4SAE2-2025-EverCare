package everCare.appointments.dtos;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class UserSimpleDTO {
    private UUID userId;
    private String name;
    private String email;
    private String keycloakId;
    private String role;
    private String phone;
    private LocalDateTime createdAt;
    private LocalDateTime dateOfBirth;
    private String emergencyContact;
    private String profilePicture;
    private Integer yearsExperience;
    private String specialization;
    private String medicalLicense;
    private String workplaceType;
    private String workplaceName;
    private String doctorEmail;
    // Don't include patients or caregivers lists
}