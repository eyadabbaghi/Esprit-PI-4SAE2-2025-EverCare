package tn.esprit.activities.dto;

import lombok.Data;

@Data
public class NotificationRequest {
    private String activityId;
    private String action;   // CREATED, UPDATED, DELETED
    private String details;
}