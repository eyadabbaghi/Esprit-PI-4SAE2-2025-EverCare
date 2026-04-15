package everCare.appointments.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clinical_measurements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicalMeasurement {

    @Id
    @Column(name = "measurement_id")
    private String measurementId;

    @PrePersist
    public void generateId() {
        if (this.measurementId == null) {
            this.measurementId = UUID.randomUUID().toString();
        }
        if (this.measuredAt == null) {
            this.measuredAt = LocalDateTime.now();
        }
    }

    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "appointment_id")
    private String appointmentId;

    private Double weight;

    @Column(name = "kidney_test_result")
    private String kidneyTestResult;

    @Column(name = "severe_liver_problem")
    private Boolean severeLiverProblem;

    @Column(name = "current_medications", length = 1000)
    private String currentMedications;

    @Column(length = 500)
    private String allergies;

    @Column(name = "measured_at")
    private LocalDateTime measuredAt;

    @Column(name = "measured_by")
    private String measuredBy;
}