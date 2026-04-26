package tn.esprit.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class NotificationRequest {

    @NotBlank
    private String activityId;        // ID of the activity (String)

    @NotBlank
    private String action;            // CREATED, UPDATED, DELETED

    private String details;            // Optional details
}