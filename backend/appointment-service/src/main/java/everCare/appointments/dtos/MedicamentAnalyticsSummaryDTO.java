package everCare.appointments.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class MedicamentAnalyticsSummaryDTO {
    private long totalMedicaments;
    private long activeMedicaments;
    private long inactiveMedicaments;
    private long usedMedicaments;
    private long unusedMedicaments;
    private long deactivatedUsedMedicaments;
}
