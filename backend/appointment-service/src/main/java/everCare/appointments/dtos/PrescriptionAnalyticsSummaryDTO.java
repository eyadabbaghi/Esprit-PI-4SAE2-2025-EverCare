package everCare.appointments.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class PrescriptionAnalyticsSummaryDTO {
    private long total;
    private long active;
    private long expired;
    private long expiringSoon;
    private long renewed;
    private long interrupted;
    private long completed;
}
