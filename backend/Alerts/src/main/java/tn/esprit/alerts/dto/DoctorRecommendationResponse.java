package tn.esprit.alerts.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DoctorRecommendationResponse {
    private String recommendationId;
    private String incidentId;
    private String doctorId;
    private String doctorName;
    private String recommendation;
    private LocalDateTime createdAt;
}
