/**
 * PrescriptionResponseDTO - Response DTO for Prescription.
 * 
 * CHANGED: Uses String patientId/doctorId instead of nested User objects.
 * User names are fetched separately via Feign client.
 */
package everCare.appointments.dtos;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionResponseDTO {

    // ========== IDENTIFIER ==========
    private String prescriptionId;

    // ========== USER REFERENCES (IDs only - fetch names via Feign) ==========
    private String patientId;
    private String doctorId;

    // ========== NESTED SUMMARIES ==========
    private MedicamentSummary medicament;
    private AppointmentSummary appointment;  // nullable

    // ========== DATES ==========
    private LocalDate datePrescription;
    private LocalDate dateDebut;
    private LocalDate dateFin;

    // ========== DOSAGE ==========
    private String posologie;
    private String instructions;

    // ========== STATUS ==========
    private String statut;
    private boolean renouvelable;
    private Integer nombreRenouvellements;

    // ========== ALZHEIMER SCHEDULE ==========
    private String priseMatin;
    private String priseMidi;
    private String priseSoir;
    private String resumeSimple;

    // ========== PDF ==========
    private String pdfUrl;

    // ========== DOCTOR NOTES ==========
    private String notesMedecin;

    // ========== AUDIT ==========
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // =====================================================================
    // NESTED SUMMARY CLASSES
    // =====================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MedicamentSummary {
        private String medicamentId;
        private String nomCommercial;
        private String denominationCommuneInternationale;
        private String dosage;
        private String forme;
        private String photoUrl;
        private String noticeSimplifiee;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AppointmentSummary {
        private String appointmentId;
        private String appointmentDate;
        private String status;
    }
}
