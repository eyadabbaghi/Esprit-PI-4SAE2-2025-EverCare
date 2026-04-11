package tn.esprit.alerts.dto;

import lombok.Data;

@Data
public class SosRequest {
    private String caregiverPhone;
    private String patientName;
    private String patientId;
}