package tn.esprit.activities.dto;

import lombok.Data;

@Data
public class UpdateActivityRequest {
    private String name;
    private String type;
    private Integer duration;
    private String scheduledTime;
    private String description;
    private String imageUrl;
    private Boolean doctorSuggested;
    private String location;
    private String startTime;
    private String monitoredBy;
}