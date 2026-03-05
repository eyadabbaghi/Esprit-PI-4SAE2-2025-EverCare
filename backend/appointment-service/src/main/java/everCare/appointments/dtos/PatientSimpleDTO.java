package everCare.appointments.dtos;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PatientSimpleDTO {
    private UUID userId;
    private String name;
    private String email;
    private String phone;
    private LocalDateTime createdAt;
    private LocalDateTime dateOfBirth;
    private String emergencyContact;
    private String profilePicture;
    private String doctorEmail;
    // Don't include caregivers list to avoid circular reference
}