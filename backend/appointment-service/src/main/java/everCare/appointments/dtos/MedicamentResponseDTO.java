package everCare.appointments.dtos;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicamentResponseDTO {

    // ========== IDENTIFIERS ==========

    private String medicamentId;
    private String codeCIP;

    // ========== BASIC INFO ==========

    private String nomCommercial;
    private String denominationCommuneInternationale;
    private String dosage;
    private String forme;
    private String laboratoire;

    // ========== PHARMACEUTICAL INFO ==========

    private String indications;
    private String contreIndications;
    private String effetsSecondaires;

    // ========== ALZHEIMER-SPECIFIC ==========

    private String photoUrl;
    private String noticeSimplifiee;

    // ========== STATUS ==========

    private boolean actif;

    // ========== AUDIT ==========

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // NOTE: This is a flat object — no nested entities.
    // Safe to serialize by Jackson with zero risk of infinite recursion.
}