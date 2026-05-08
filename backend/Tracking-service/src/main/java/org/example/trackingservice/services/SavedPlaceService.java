package org.example.trackingservice.services;

import org.example.trackingservice.entities.SavedPlace;
import org.example.trackingservice.repositories.SavedPlaceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SavedPlaceService {

    private final SavedPlaceRepository repo;
    private final PatientValidationService patientValidationService;

    public SavedPlaceService(SavedPlaceRepository repo,
                             PatientValidationService patientValidationService) {
        this.repo = repo;
        this.patientValidationService = patientValidationService;
    }

    public SavedPlace add(SavedPlace place) {

        if (place.getPatientId() == null || place.getPatientId().isEmpty()) {
            throw new RuntimeException("patientId is required");
        }

        var validation = patientValidationService.validatePatientExists(place.getPatientId());
        if (validation != null && validation.getUserId() == null) {
            throw new RuntimeException("Invalid patient: " + place.getPatientId());
        }

        if (place.getRadius() == null) {
            place.setRadius(350.0);
        }

        return repo.save(place);
    }

    public List<SavedPlace> getByPatient(String patientId) {
        if (patientId == null || patientId.isEmpty()) {
            return repo.findAll();
        }
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
