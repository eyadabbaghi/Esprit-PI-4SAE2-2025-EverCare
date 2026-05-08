package everCare.appointments.repositories;

import everCare.appointments.entities.ClinicalMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClinicalMeasurementRepository extends JpaRepository<ClinicalMeasurement, String> {

    Optional<ClinicalMeasurement> findByAppointmentId(String appointmentId);

    List<ClinicalMeasurement> findByPatientIdOrderByMeasuredAtDesc(String patientId);

    Optional<ClinicalMeasurement> findTopByPatientIdOrderByMeasuredAtDesc(String patientId);
}