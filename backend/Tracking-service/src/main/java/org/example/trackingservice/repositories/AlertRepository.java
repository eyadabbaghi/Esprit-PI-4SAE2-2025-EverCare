package org.example.trackingservice.repositories;

import org.example.trackingservice.entities.Alert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByPatientIdOrderByTimestampDesc(String patientId);

    Alert findTopByPatientIdAndMessageOrderByTimestampDesc(String patientId, String message);
}
