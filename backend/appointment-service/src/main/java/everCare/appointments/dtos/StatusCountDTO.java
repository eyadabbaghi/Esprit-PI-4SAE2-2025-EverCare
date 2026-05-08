package everCare.appointments.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class StatusCountDTO {
    private String status;
    private long count;
}
