package tn.esprit.activities.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserActivityDTO {
    private String id;
    private String userId;
    private String activityId;
    private boolean completed;
    private boolean favorite;
    private Integer userRating;
    private LocalDateTime completedAt;
}