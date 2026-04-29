package tn.esprit.alerts.dto;

import lombok.Data;

@Data
public class SmsRequest {
    private String alertId;
    private String caregiverPhone;
    private String patientName;
    private String alertLabel;
    private String incidentTitle;
}