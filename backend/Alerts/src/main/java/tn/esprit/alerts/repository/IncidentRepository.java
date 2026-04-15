package tn.esprit.alerts.repository;

import tn.esprit.alerts.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IncidentRepository extends JpaRepository<Incident, String> {
    // in IncidentRepository.java — add this line
    List<Incident> findByPatientId(String patientId);
}
