/**
 * Prescription - Entity for prescription records.
 * 
 * CHANGED: Replaced @ManyToOne User relationships with String userId fields.
 * User data is now fetched from User microservice via Feign client.
 */
package everCare.appointments.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prescriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {

    @Id
    @Column(name = "prescription_id")
    private String prescriptionId;

    @PrePersist
    public void generateId() {
        if (this.prescriptionId == null) {
            this.prescriptionId = UUID.randomUUID().toString();
        }
        this.createdAt = LocalDateTime.now();
    }

    // ========== USER REFERENCES (IDs only - data fetched via Feign) ==========

    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "doctor_id", nullable = false)
    private String doctorId;

    // ========== APPOINTMENT REFERENCE ==========

    @ManyToOne
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    // ========== MEDICAMENT RELATION ==========

    @ManyToOne
    @JoinColumn(name = "medicament_id", nullable = false)
    private Medicament medicament;

    // ========== DATES ==========

    @Column(nullable = false)
    private LocalDate datePrescription;

    private LocalDate dateDebut;
    private LocalDate dateFin;

    // ========== DOSAGE ==========

    private String posologie;
    private String instructions;

    // ========== STATUS ==========

    private String statut; // ACTIVE, TERMINEE, INTERROMPUE

    @Builder.Default
    private Boolean renouvelable = false;

    @Builder.Default
    private Integer nombreRenouvellements = 0;

    // ========== FOR ALZHEIMER PATIENTS ==========

    private String priseMatin;
    private String priseMidi;
    private String priseSoir;

    @Column(length = 500)
    private String resumeSimple;

    private String pdfUrl;

    // ========== TRACKING ==========

    private String notesMedecin;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
