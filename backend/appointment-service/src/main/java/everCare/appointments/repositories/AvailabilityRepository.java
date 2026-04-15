package everCare.appointments.repositories;

import everCare.appointments.entities.Availability;
import everCare.appointments.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, String> {

    // Find by doctor
    List<Availability> findByDoctor(User doctor);

    // Find by doctor and day of week
    List<Availability> findByDoctorAndDayOfWeek(User doctor, DayOfWeek dayOfWeek);

    // Find valid availabilities for a doctor on a specific date
    @Query("SELECT a FROM Availability a WHERE a.doctor = :doctor AND a.validFrom <= :date AND a.validTo >= :date AND a.isBlocked = false")
    List<Availability> findValidByDoctorAndDate(@Param("doctor") User doctor, @Param("date") LocalDate date);

    // Find blocked slots (exceptions)
    List<Availability> findByDoctorAndIsBlockedTrue(User doctor);

    // Find by recurrence type
    List<Availability> findByRecurrence(String recurrence);

    // Find by doctor and valid period
    List<Availability> findByDoctorAndValidFromLessThanEqualAndValidToGreaterThanEqual(User doctor, LocalDate from, LocalDate to);
}