package tn.esprit.alerts.repository;

import tn.esprit.alerts.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, String> {
    List<Alert> findByIncident_IncidentId(String incidentId);
}