package everCare.appointments.dtos;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AppointmentResponseDTO {
    private String appointmentId;
    private String patientId;
    private String patientName;
    private String patientPhoto;
    private String doctorId;
    private String doctorName;
    private String doctorPhoto;
    private String caregiverId;
    private String caregiverName;
    private String consultationTypeId;
    private String consultationTypeName;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private String status;
    private LocalDateTime confirmationDatePatient;
    private LocalDateTime confirmationDateCaregiver;
    private String caregiverPresence;
    private String videoLink;
    private boolean isRecurring;
    private String recurrencePattern;
    private String doctorNotes;
    private String simpleSummary;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}