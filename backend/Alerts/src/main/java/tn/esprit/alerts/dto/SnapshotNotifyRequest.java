// src/main/java/tn/esprit/alerts/dto/SnapshotNotifyRequest.java
package tn.esprit.alerts.dto;

import lombok.Data;

@Data
public class SnapshotNotifyRequest {
    private String caregiverEmail;
    private String patientName;
    private String snapshotBase64; // optional, store or send via email
}