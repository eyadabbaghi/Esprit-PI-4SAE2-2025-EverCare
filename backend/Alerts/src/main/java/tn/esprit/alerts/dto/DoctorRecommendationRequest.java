package tn.esprit.alerts.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DoctorRecommendationRequest {
    @NotBlank
    private String doctorId;

    @NotBlank
    @Size(max = 180)
    private String doctorName;

    @NotBlank
    @Size(max = 2000)
    private String recommendation;
}
