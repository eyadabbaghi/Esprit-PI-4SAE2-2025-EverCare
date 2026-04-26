package tn.esprit.dailymeservice.Dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class DailyEntryDTO {

    private Long id;

    @NotBlank(message = "Patient ID is required")
    private String patientId;   // UUID String

    @NotNull(message = "Date is required")
    @PastOrPresent(message = "Date cannot be in the future")
    private LocalDate entryDate;

    @NotBlank(message = "Emotion is required")
    @Pattern(
            regexp = "Happy|Neutral|Sad|Anxious|Confused|Angry|Tired|Excited|Calm",
            message = "Invalid emotion value"
    )
    private String dailyEmotion;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    private String notes;
}
