package everCare.appointments.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medicaments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medicament {

    @Id
    @Column(name = "medicament_id")
    private String medicamentId;

    @PrePersist
    public void generateId() {
        if (this.medicamentId == null) {
            this.medicamentId = UUID.randomUUID().toString();
        }
        this.createdAt = LocalDateTime.now();
    }


    // ========== INFORMATIONS DE BASE ==========

    @Column(nullable = false)
    private String nomCommercial;        // Donépézil Sandoz

    @Column(nullable = false)
    private String denominationCommuneInternationale; // Donépézil (DCI)

    private String dosage;                // 10mg, 5mg, etc.

    private String forme;                  // Comprimé, solution buvable, patch

    private String codeCIP;                 // Code identifiant (13 chiffres)

    // ========== INFORMATIONS PHARMACEUTIQUES ==========

    private String laboratoire;             // Laboratoire fabricant

    @Column(length = 500)
    private String indications;              // Indications thérapeutiques

    @Column(length = 500)
    private String contreIndications;        // Contre-indications

    @Column(length = 1000)
    private String effetsSecondaires;        // Effets secondaires fréquents

    // ========== POUR PATIENTS ALZHEIMER ==========


    private String photoUrl;                  // Photo du médicament (pour reconnaissance)

    @Column(length = 500)
    private String noticeSimplifiee;           // Version simplifiée pour patient Alzheimer

    // ========== DOSING RULES FOR SAFETY CHECKS ==========

    @Column(name = "max_dose_per_day")
    private String maxDosePerDay;             // e.g. "200mg", "2 tablets"

    @Column(name = "weight_max_dose", length = 200)
    private String weightMaxDose;            // e.g. "max 2mg/kg/day"

    @Column(name = "renal_adjustment", length = 500)
    private String renalAdjustment;          // e.g. "50% if eGFR<30, 75% if eGFR<60"

    @Column(name = "hepatic_adjustment", length = 500)
    private String hepaticAdjustment;      // e.g. "Avoid if severe liver problem"

    @Column(name = "contraindications", length = 500)
    private String contraindications;       // e.g. "Pregnancy, severe renal impairment"

    @Column(name = "common_interactions", length = 500)
    private String commonInteractions;     // e.g. "Warfarin, Digoxin, Aspirin"

    @Column(name = "dose_calculation")
    private String doseCalculation;        // e.g. "1 tablet = 10mg" for parsing posologie

    // ========== SUIVI ==========

    private boolean actif;                     // Médicament toujours commercialisé ?

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

}
