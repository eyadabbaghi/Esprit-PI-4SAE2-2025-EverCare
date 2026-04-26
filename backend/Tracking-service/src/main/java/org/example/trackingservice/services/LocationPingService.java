package org.example.trackingservice.services;

import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.repositories.LocationPingRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationPingService {

    private final LocationPingRepository repo;

    public LocationPingService(LocationPingRepository repo) {
        this.repo = repo;
    }

    public LocationPing add(LocationPing ping) {
        return repo.save(ping);
    }

    public List<LocationPing> getByPatient(String patientId) {
        return repo.findByPatientIdOrderByTimestampDesc(patientId);
    }

    public LocationPing update(Long id, LocationPing newData) {
        LocationPing existing = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("LocationPing not found"));

        existing.setLat(newData.getLat());
        existing.setLng(newData.getLng());
        // timestamp usually not updated, but you can allow it:
        // existing.setTimestamp(newData.getTimestamp());

        return repo.save(existing);
    }

    public void delete(Long id) {
        repo.deleteById(id);
    }
}