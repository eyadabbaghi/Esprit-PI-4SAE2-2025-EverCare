package everCare.appointments.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "availabilities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Availability {

    @Id
    @Column(name = "availability_id")
    private String availabilityId;

    @PrePersist
    public void generateId() {
        if (this.availabilityId == null) {
            this.availabilityId = UUID.randomUUID().toString();
        }
    }

    // ========== LIEN VERS MÉDECIN ==========

    @ManyToOne
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor; // User with role = DOCTOR

    // ========== CRÉNEAU ==========

    private DayOfWeek dayOfWeek; // LUNDI, MARDI, etc.

    private LocalTime startTime;
    private LocalTime endTime;

    // ========== PÉRIODE DE VALIDITÉ ==========

    private LocalDate validFrom;
    private LocalDate validTo;

    // ========== RÉCURRENCE ==========

    private String recurrence; // WEEKLY, BIWEEKLY, MONTHLY, ONCE

    // ========== EXCEPTIONS ==========

    private boolean isBlocked; // Pour congés, réunions
    private String blockReason;
}