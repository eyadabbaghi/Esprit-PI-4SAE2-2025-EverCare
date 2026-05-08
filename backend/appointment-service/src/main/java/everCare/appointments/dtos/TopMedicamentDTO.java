package everCare.appointments.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TopMedicamentDTO {
    private String medicamentId;
    private String nomCommercial;
    private long prescriptionCount;
}
