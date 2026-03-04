package com.example.medicalrecordservice.dto;

import com.example.medicalrecordservice.entity.MedicalHistoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class MedicalHistoryCreateRequest {

    @NotNull(message = "type is required")
    private MedicalHistoryType type;

    @NotNull(message = "date is required")
    @PastOrPresent(message = "date cannot be in the future")
    private LocalDate date;

    @NotBlank(message = "description is required")
    @Size(max = 2000, message = "description must be at most 2000 characters")
    private String description;
}
