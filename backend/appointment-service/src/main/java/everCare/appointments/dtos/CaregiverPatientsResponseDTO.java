package everCare.appointments.dtos;

import lombok.Data;

import java.util.List;

@Data
public class CaregiverPatientsResponseDTO {
    private List<UserSimpleDTO> patients;
}
