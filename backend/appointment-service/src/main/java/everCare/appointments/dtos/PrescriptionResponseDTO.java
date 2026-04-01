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

    // ========== NESTED SUMMARIES (flat — no full entity objects) ==========

    // Instead of returning the full User entity (which has password, roles, etc.)
    // we return only the fields the frontend needs.

    private PatientSummary patient;
    private DoctorSummary doctor;
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
    // These are static inner classes — small, flat, safe to serialize.
    // They contain ONLY what the frontend needs, nothing sensitive.
    // =====================================================================

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PatientSummary {
        private String userId;
        private String name;
        private String email;
        // No password, no tokens, no internal fields
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DoctorSummary {
        private String userId;
        private String name;
        private String specialization;  // Useful for the prescription header
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MedicamentSummary {
        private String medicamentId;
        private String nomCommercial;
        private String denominationCommuneInternationale;
        private String dosage;
        private String forme;
        private String photoUrl;         // For Alzheimer visual display
        private String noticeSimplifiee; // For simplified patient view
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AppointmentSummary {
        private String appointmentId;
        private String appointmentDate;  // Formatted string is fine for display
        private String status;
    }
}