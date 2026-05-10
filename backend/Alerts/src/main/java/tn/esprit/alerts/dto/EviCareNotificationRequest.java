package tn.esprit.alerts.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EviCareNotificationRequest {
    private String activityId;
    private String action;
    private String details;
    private List<String> targetUserIds;

    public EviCareNotificationRequest(String activityId, String action, String details) {
        this.activityId = activityId;
        this.action = action;
        this.details = details;
    }
}
