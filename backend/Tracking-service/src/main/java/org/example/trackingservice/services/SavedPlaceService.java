package org.example.trackingservice.services;

import org.example.trackingservice.entities.SavedPlace;
import org.example.trackingservice.repositories.SavedPlaceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SavedPlaceService {

    private final SavedPlaceRepository repo;

    public SavedPlaceService(SavedPlaceRepository repo) {
        this.repo = repo;
    }

    public SavedPlace add(SavedPlace place) {
        return repo.save(place);
    }

    public List<SavedPlace> getByPatient(String patientId) {
        return repo.findByPatientId(patientId);
    }

    public SavedPlace update(Long id, SavedPlace newData) {
        SavedPlace existing = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("SavedPlace not found"));

        existing.setLabel(newData.getLabel());
        existing.setAddressText(newData.getAddressText());
        existing.setLat(newData.getLat());
        existing.setLng(newData.getLng());

        return repo.save(existing);
    }

    public void delete(Long id) {
        repo.deleteById(id);
    }
}