package everCare.appointments.dtos;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicalMeasurementRequestDTO {

    private String patientId;
    private String appointmentId;
    private Double weight;
    private String kidneyTestResult;
    private Boolean severeLiverProblem;
    private String currentMedications;
    private String allergies;
}