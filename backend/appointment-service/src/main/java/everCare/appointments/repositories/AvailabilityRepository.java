/**
 * AvailabilityRepository - Repository for Availability entity.
 * 
 * CHANGED: Updated queries to use String doctorId instead of User entity.
 */
package everCare.appointments.repositories;

import everCare.appointments.entities.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, String> {

    // Find by doctor ID
    List<Availability> findByDoctorId(String doctorId);

    // Find by doctor ID and day of week
    List<Availability> findByDoctorIdAndDayOfWeek(String doctorId, DayOfWeek dayOfWeek);

    // Find valid availabilities for a doctor on a specific date
    @Query("SELECT a FROM Availability a WHERE a.doctorId = :doctorId AND a.validFrom <= :date AND a.validTo >= :date AND a.isBlocked = false")
    List<Availability> findValidByDoctorIdAndDate(@Param("doctorId") String doctorId, @Param("date") LocalDate date);

    // Find blocked slots (exceptions)
    List<Availability> findByDoctorIdAndIsBlockedTrue(String doctorId);

    // Find by recurrence type
    List<Availability> findByRecurrence(String recurrence);

    // Find by doctor and valid period
    List<Availability> findByDoctorIdAndValidFromLessThanEqualAndValidToGreaterThanEqual(String doctorId, LocalDate from, LocalDate to);
}
