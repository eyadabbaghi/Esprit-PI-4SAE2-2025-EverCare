/**
 * Appointment - Entity for appointment records.
 * 
 * CHANGED: Replaced @ManyToOne User relationships with String userId fields.
 * User data is now fetched from User microservice via Feign client instead of
 * being stored locally. This eliminates data duplication and ensures consistency.
 * 
 * Fields changed:
 * - User patient -> String patientId
 * - User doctor -> String doctorId  
 * - User caregiver -> String caregiverId (nullable)
 */
package everCare.appointments.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @Column(name = "appointment_id")
    private String appointmentId;

    @PrePersist
    public void generateId() {
        if (this.appointmentId == null) {
            this.appointmentId = UUID.randomUUID().toString();
        }
        this.createdAt = LocalDateTime.now();
    }

    // ========== USER REFERENCES (IDs only - data fetched via Feign) ==========

    @Column(name = "patient_id", nullable = false)
    private String patientId;

    @Column(name = "doctor_id", nullable = false)
    private String doctorId;

    @Column(name = "caregiver_id")
    private String caregiverId;

    // ========== CONSULTATION TYPE ==========

    @ManyToOne
    @JoinColumn(name = "consultation_type_id")
    private ConsultationType consultationType;

    // ========== DATES AND TIMES ==========

    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;

    // ========== STATUS ==========

    private String status; // SCHEDULED, CONFIRMED_BY_PATIENT, CONFIRMED_BY_CAREGIVER, COMPLETED, CANCELLED, MISSED

    // ========== VALIDATIONS ==========

    private LocalDateTime confirmationDatePatient;
    private LocalDateTime confirmationDateCaregiver;

    // ========== CAREGIVER PRESENCE ==========

    private String caregiverPresence; // PHYSICAL, REMOTE, NONE

    // ========== VIDEO LINK ==========

    private String videoLink;

    // ========== RECURRENCE ==========

    private boolean isRecurring;
    private String recurrencePattern; // WEEKLY, BIWEEKLY, MONTHLY

    // ========== NOTES ==========

    @Column(length = 1000)
    private String doctorNotes;

    @Column(length = 500)
    private String simpleSummary;

    // ========== TRACKING ==========

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
