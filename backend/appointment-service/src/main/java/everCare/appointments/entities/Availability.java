/**
 * Availability - Entity for doctor availability slots.
 * 
 * CHANGED: Replaced @ManyToOne User relationship with String doctorId.
 * User data is now fetched from User microservice via Feign client.
 */
package everCare.appointments.entities;

import com.fasterxml.jackson.annotation.JsonAlias;
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

    // ========== DOCTOR REFERENCE (ID only - data fetched via Feign) ==========

    @Column(name = "doctor_id", nullable = false)
    private String doctorId;

    // ========== SLOT ==========

    private DayOfWeek dayOfWeek; // MONDAY, TUESDAY, etc.

    private LocalTime startTime;
    private LocalTime endTime;

    // ========== VALIDITY PERIOD ==========

    private LocalDate validFrom;
    private LocalDate validTo;

    // ========== RECURRENCE ==========

    private String recurrence; // WEEKLY, BIWEEKLY, MONTHLY, ONCE

    // ========== EXCEPTIONS ==========

    @JsonAlias("isBlocked")
    private boolean isBlocked; // For vacations, meetings
    private String blockReason;
}
