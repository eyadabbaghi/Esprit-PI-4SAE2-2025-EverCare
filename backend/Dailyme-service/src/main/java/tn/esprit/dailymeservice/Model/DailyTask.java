package tn.esprit.dailymeservice.Model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Data
@Table(name = "daily_task")
public class DailyTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Patient ID is required")
    @Column(nullable = false, length = 64)
    private String patientId;

    @NotBlank
    @Size(min = 3, max = 255)
    private String title;

    @NotBlank
    @Pattern(regexp = "MEDICATION|MEAL|EXERCISE|APPOINTMENT|SOCIAL|OTHER")
    private String taskType;

    @NotNull
    @Column(name = "scheduled_time", nullable = false)
    private LocalTime scheduledTime;

    private boolean completed;

    private LocalDateTime completedAt;

    @Size(max = 500)
    private String notes;

    // ✅ NEW: archive fields
    @Column(nullable = false)
    private boolean archived;

    private LocalDateTime archivedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        archived = false;
        archivedAt = null;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();

        if (completed && completedAt == null) completedAt = LocalDateTime.now();
        if (!completed) completedAt = null;
    }
}