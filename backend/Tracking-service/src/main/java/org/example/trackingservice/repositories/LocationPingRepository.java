package org.example.trackingservice.repositories;

import org.example.trackingservice.entities.LocationPing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LocationPingRepository extends JpaRepository<LocationPing, Long> {
    List<LocationPing> findByPatientIdOrderByTimestampDesc(String patientId);
}