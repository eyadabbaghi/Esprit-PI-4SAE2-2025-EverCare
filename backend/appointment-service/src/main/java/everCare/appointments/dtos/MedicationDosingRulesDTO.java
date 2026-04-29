package everCare.appointments.dtos;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicationDosingRulesDTO {

    private String medicamentId;

    private String maxDosePerDay;
    private String weightMaxDose;
    private String renalAdjustment;
    private String hepaticAdjustment;
    private String contraindications;
    private String commonInteractions;
    private String doseCalculation;
}