package com.example.medicalrecordservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class AssessmentCreateRequest {

    @NotBlank(message = "patientId is required")
    @Size(max = 100, message = "patientId must be at most 100 characters")
    private String patientId;

    @Size(max = 255, message = "patientName must be at most 255 characters")
    private String patientName;

    @Size(max = 255, message = "caregiverName must be at most 255 characters")
    private String caregiverName;

    @NotEmpty(message = "answers are required")
    private Map<
            @NotBlank(message = "answer key cannot be blank") String,
            @NotNull(message = "answer score is required") @Min(value = 0, message = "answer score must be >= 0") @Max(value = 3, message = "answer score must be <= 3") Integer
            > answers;
}
