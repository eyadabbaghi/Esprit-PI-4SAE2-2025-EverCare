package everCare.appointments.dtos;

import lombok.Data;
import java.util.UUID;

@Data
public class ConsultationTypeSimpleDTO {
    private UUID id;
    private String name;
    private Integer duration;
    private String description;
    private Double price;
    private Boolean isActive;
}