package everCare.appointments.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class MedicamentUsageStatsDTO {
    private String medicamentId;
    private String nomCommercial;
    private boolean actif;
    private long totalPrescriptions;
    private long activePrescriptions;
    private LocalDate lastPrescribedDate;
}
