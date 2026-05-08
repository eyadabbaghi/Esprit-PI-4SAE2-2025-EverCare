package everCare.appointments.dtos;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SafetyCheckResult {

    private boolean isSafe;
    private String level; // INFO, WARNING, CRITICAL
    private String message;
    private String suggestedDose;
    private List<String> interactions;
    private List<String> contraindications;
}