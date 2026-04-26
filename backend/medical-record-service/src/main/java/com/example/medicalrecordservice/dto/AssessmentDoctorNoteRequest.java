package com.example.medicalrecordservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssessmentDoctorNoteRequest {

    @NotBlank(message = "note is required")
    @Size(max = 2000, message = "note must be at most 2000 characters")
    private String note;
}
