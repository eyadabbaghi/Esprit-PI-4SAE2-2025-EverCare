package tn.esprit.dailymeservice.Dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DailyTaskDTO {

    private Long id;

    @NotBlank
    private String patientId;

    @NotBlank
    @Size(min = 3, max = 255)
    private String title;

    @NotBlank
    @Pattern(regexp = "MEDICATION|MEAL|EXERCISE|APPOINTMENT|SOCIAL|OTHER")
    private String taskType;

    @NotBlank
    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String scheduledTime;   // "HH:mm"

    @Size(max = 500)
    private String notes;

    private boolean completed;

    // ✅ NEW: dates + history fields (returned to Angular)
    private boolean archived;
    private LocalDateTime archivedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
}