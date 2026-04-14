package tn.esprit.alerts.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class AlertRequest {
    @NotBlank
    private String incidentId;

    @NotBlank
    private String senderId;

    @NotBlank
    private String targetId;

    private String label;               // optional
    private Boolean immediate;           // if true, send immediately
    private String scheduledTime;        // format "HH:mm" (24-hour)
    private List<String> repeatDays;     // e.g., ["MON", "WED", "FRI"]
    private String status;               // optional, e.g., "SENT", "ACKNOWLEDGED", "RESOLVED"
}