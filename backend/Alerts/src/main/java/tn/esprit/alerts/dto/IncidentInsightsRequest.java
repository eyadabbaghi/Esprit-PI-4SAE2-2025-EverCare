package tn.esprit.alerts.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class IncidentInsightsRequest {
    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 100)
    private String type;

    @NotBlank
    @Size(max = 1000)
    private String description;

    @Size(max = 100)
    private String severity;

    @Size(max = 200)
    private String location;
}
