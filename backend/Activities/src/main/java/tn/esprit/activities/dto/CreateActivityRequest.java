package tn.esprit.activities.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateActivityRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String type;

    @Min(1)
    private int duration;

    private String scheduledTime;

    @NotBlank
    private String description;

    private String imageUrl;

    private boolean doctorSuggested;

    private String location;
    private String startTime;
    private String monitoredBy;
}