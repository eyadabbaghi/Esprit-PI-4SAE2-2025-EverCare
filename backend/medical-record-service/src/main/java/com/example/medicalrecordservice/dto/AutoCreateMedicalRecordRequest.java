package com.example.medicalrecordservice.dto;

import com.example.medicalrecordservice.entity.AlzheimerStage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AutoCreateMedicalRecordRequest {

    @NotBlank(message = "patientId is required")
    @Size(max = 100, message = "patientId must be at most 100 characters")
    private String patientId;

    @Pattern(regexp = "^(A|B|AB|O)[+-]$", message = "bloodGroup must match ^(A|B|AB|O)[+-]$")
    private String bloodGroup;

    private AlzheimerStage alzheimerStage;

    @Size(max = 1000, message = "allergies must be at most 1000 characters")
    private String allergies;

    @Size(max = 1000, message = "chronicDiseases must be at most 1000 characters")
    private String chronicDiseases;

    @Size(max = 255, message = "emergencyContactName must be at most 255 characters")
    private String emergencyContactName;

    @Size(max = 32, message = "emergencyContactPhone must be at most 32 characters")
    @Pattern(regexp = "^[0-9+\\-\\s()]{6,32}$", message = "emergencyContactPhone format is invalid")
    private String emergencyContactPhone;
}
