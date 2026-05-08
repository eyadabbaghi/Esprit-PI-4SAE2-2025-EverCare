package tn.esprit.activities.dto;

import lombok.Data;

@Data
public class RecommendRequest {
    private String doctorId;
    private String patientId;
    private String activityId;
}