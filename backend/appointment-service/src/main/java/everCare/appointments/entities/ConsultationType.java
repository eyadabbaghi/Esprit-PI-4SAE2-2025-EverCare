package everCare.appointments.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "consultation_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultationType {

    @Id
    @Column(name = "type_id")
    private String typeId;

    @PrePersist
    public void generateId() {
        if (this.typeId == null) {
            this.typeId = UUID.randomUUID().toString();
        }
    }

    // ========== INFORMATIONS DE BASE ==========

    private String name; // SUI-20, COG-40, MED-15, ANN-45, TEL-10

    private String description;

    // ========== DURÉES ==========

    private int defaultDurationMinutes; // Durée standard


    // ========== CONFIGURATION ==========

    private boolean requiresCaregiver; // Aidant requis ?

    private String environmentPreset; // STANDARD, CALME, CONTRASTE, etc.

    private boolean active;
}