package tn.esprit.alerts.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EviCareNotificationRequest {
    private String activityId;   // use patientId here — reuses existing field
    private String action;       // always "EVICARE_ALERT"
    private String details;      // the advice message
}