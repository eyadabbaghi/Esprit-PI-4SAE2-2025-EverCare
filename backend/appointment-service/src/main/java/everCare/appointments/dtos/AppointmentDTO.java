package everCare.appointments.dtos;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AppointmentDTO {
    private String appointmentId;
    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String caregiverId;
    private String caregiverName;
    private String consultationTypeId;
    private String consultationTypeName;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private String status;
    private String caregiverPresence;
    private String videoLink;
    private String simpleSummary;
}