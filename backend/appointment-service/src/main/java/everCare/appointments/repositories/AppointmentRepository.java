/**
 * AppointmentRepository - Repository for Appointment entity.
 * 
 * CHANGED: Updated queries to use String userId instead of User entity.
 * User validation is now done via Feign client before database operations.
 */
package everCare.appointments.repositories;

import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.ConsultationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    // Find by patient ID
    List<Appointment> findByPatientId(String patientId);

    // Find by doctor ID
    List<Appointment> findByDoctorId(String doctorId);

    // Find by caregiver ID
    List<Appointment> findByCaregiverId(String caregiverId);

    // Find by status
    List<Appointment> findByStatus(String status);

    // Find by date range
    List<Appointment> findByStartDateTimeBetween(LocalDateTime start, LocalDateTime end);

    // Find by doctor and date range
    List<Appointment> findByDoctorIdAndStartDateTimeBetween(String doctorId, LocalDateTime start, LocalDateTime end);

    // Find future appointments by patient
    @Query("SELECT a FROM Appointment a WHERE a.patientId = :patientId AND a.startDateTime > :now ORDER BY a.startDateTime")
    List<Appointment> findFutureByPatientId(@Param("patientId") String patientId, @Param("now") LocalDateTime now);

    // Find by consultation type
    List<Appointment> findByConsultationType(ConsultationType consultationType);

    // Check if doctor is available at specific time
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctorId = :doctorId AND a.startDateTime = :dateTime AND a.status != 'CANCELLED'")
    int countByDoctorIdAndDateTime(@Param("doctorId") String doctorId, @Param("dateTime") LocalDateTime dateTime);

    // Find appointments for tomorrow (pre-consultation form trigger)
    @Query("SELECT a FROM Appointment a WHERE a.startDateTime >= :startOfDay AND a.startDateTime < :endOfDay AND a.status IN ('SCHEDULED', 'CONFIRMED_BY_PATIENT')")
    List<Appointment> findTomorrowAppointments(@Param("startOfDay") LocalDateTime startOfDay, @Param("endOfDay") LocalDateTime endOfDay);

    // Find appointments entering the upcoming-reminder window
    @Query("SELECT a FROM Appointment a WHERE a.startDateTime >= :windowStart AND a.startDateTime < :windowEnd AND a.status IN ('SCHEDULED', 'CONFIRMED_BY_PATIENT', 'CONFIRMED_BY_CAREGIVER', 'RESCHEDULED')")
    List<Appointment> findUpcomingReminderAppointments(@Param("windowStart") LocalDateTime windowStart, @Param("windowEnd") LocalDateTime windowEnd);
}
