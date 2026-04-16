package everCare.appointments.dtos;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SafetyCheckResponseDTO {

    private boolean isValid;
    private String level;           // "SAFE", "WARNING", "CRITICAL"
    private String message;
    private List<String> warnings;
    private boolean requiresJustification;
    private String suggestedDose;
    private List<String> interactions;
    private List<String> contraindications;
}