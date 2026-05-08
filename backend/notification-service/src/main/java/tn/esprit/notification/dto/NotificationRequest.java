package tn.esprit.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class NotificationRequest {

    @NotBlank
    private String activityId;        // ID of the activity (String)

    @NotBlank
    private String action;            // CREATED, UPDATED, DELETED, PRE_CONSULTATION_FORM

    private String details;           // Optional details

    private List<String> targetUserIds;  // Specific users to notify (for caregiver notifications)
}