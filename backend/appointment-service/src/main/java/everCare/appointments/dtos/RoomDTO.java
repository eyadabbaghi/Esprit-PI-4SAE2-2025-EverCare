package everCare.appointments.dtos;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.Set;

@Data
public class RoomDTO {
    private String roomId;
    private String appointmentId;
    private String doctorId;
    private String doctorName;
    private String patientId;
    private String patientName;
    private String caregiverId;
    private String caregiverName;
    private Set<String> participants;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private boolean isActive;
}