package tn.esprit.activities.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ActivityDTO {
    private String id;
    private String name;
    private String type;
    private int duration;
    private String scheduledTime;
    private String description;
    private String imageUrl;
    private double rating;
    private int totalRatings;
    private boolean doctorSuggested;
    private String location;
    private String startTime;
    private String monitoredBy;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdated;
    private List<ActivityDetailsDTO> details; // optional, for admin
}
