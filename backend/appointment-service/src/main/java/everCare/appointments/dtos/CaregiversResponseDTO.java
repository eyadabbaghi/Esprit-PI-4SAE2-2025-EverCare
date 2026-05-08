package everCare.appointments.dtos;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaregiversResponseDTO {

    private List<UserSimpleDTO> caregivers;
}