package org.example.trackingservice.repositories;

import org.example.trackingservice.entities.SavedPlace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedPlaceRepository extends JpaRepository<SavedPlace, Long> {
    List<SavedPlace> findByPatientId(String patientId);
}