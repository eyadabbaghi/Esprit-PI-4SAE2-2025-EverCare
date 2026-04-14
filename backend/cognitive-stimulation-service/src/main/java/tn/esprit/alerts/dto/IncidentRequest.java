package tn.esprit.alerts.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class IncidentRequest {
    @NotBlank
    @Size(max = 200)
    private String title;

    @NotBlank
    @Size(max = 100)
    private String type;

    @NotBlank
    @Size(max = 1000)
    private String description;

    @NotNull
    private String severity;   // will be converted to Severity enum

    @NotBlank
    private String reportedByUserId;

    @NotBlank
    private String patientId;

    @Size(max = 200)
    private String location;    // optional
}