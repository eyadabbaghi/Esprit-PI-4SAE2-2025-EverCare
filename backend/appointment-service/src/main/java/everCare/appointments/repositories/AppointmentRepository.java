package everCare.appointments.repositories;

import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.ConsultationType;
import everCare.appointments.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    // Find by patient
    List<Appointment> findByPatient(User patient);

    // Find by doctor
    List<Appointment> findByDoctor(User doctor);

    // Find by caregiver
    List<Appointment> findByCaregiver(User caregiver);

    // Find by status
    List<Appointment> findByStatus(String status);

    // Find by date range
    List<Appointment> findByStartDateTimeBetween(LocalDateTime start, LocalDateTime end);

    // Find by doctor and date range
    List<Appointment> findByDoctorAndStartDateTimeBetween(User doctor, LocalDateTime start, LocalDateTime end);

    // Find future appointments by patient
    @Query("SELECT a FROM Appointment a WHERE a.patient = :patient AND a.startDateTime > :now ORDER BY a.startDateTime")
    List<Appointment> findFutureByPatient(@Param("patient") User patient, @Param("now") LocalDateTime now);

    // Find by consultation type
    List<Appointment> findByConsultationType(ConsultationType consultationType);

    // Check if doctor is available at specific time
    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.doctor = :doctor AND a.startDateTime = :dateTime AND a.status != 'CANCELLED'")
    int countByDoctorAndDateTime(@Param("doctor") User doctor, @Param("dateTime") LocalDateTime dateTime);
}