package tn.esprit.alerts.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class IncidentResponse {
    private String incidentId;
    private String title;
    private String type;
    private String description;
    private String severity;
    private String status;
    private LocalDateTime incidentDate;
    private String reportedByUserId;
    private String location;
    private List<AlertResponse> alerts;
    private String patientId;
}