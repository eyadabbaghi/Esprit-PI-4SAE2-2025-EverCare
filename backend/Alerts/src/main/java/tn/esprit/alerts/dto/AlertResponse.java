package tn.esprit.alerts.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AlertResponse {
    private String alertId;
    private String incidentId;
    private String senderId;
    private String targetId;
    private String status;
    private LocalDateTime sentAt;
    private LocalDateTime acknowledgedAt;
    private String label;
    private String scheduledTime;        // as string "HH:mm"
    private List<String> repeatDays;
}