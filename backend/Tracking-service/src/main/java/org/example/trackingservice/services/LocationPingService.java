package org.example.trackingservice.services;

import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.repositories.LocationPingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LocationPingService {

    private final LocationPingRepository repo;
    private final TrackingLogicService logic;
    private final PatientValidationService patientValidationService;

    public LocationPingService(LocationPingRepository repo,
                               TrackingLogicService logic,
                               PatientValidationService patientValidationService) {
        this.repo = repo;
        this.logic = logic;
        this.patientValidationService = patientValidationService;
    }

    // ================= GET ALL =================
    public List<LocationPing> getAll() {

        List<LocationPing> list = repo.findAll();

        for (int i = 0; i < list.size(); i++) {
            list.set(i, logic.processPing(list.get(i)));
        }

        return list;
    }

    // ================= CREATE =================
    public LocationPing add(LocationPing ping) {

        var validation = patientValidationService.validatePatientExists(ping.getPatientId());
        if (validation != null && validation.getUserId() == null) {
            throw new RuntimeException("Invalid patient");
        }
        ping = logic.processPing(ping);

        return repo.save(ping);
    }

    // ================= HISTORY =================
    public List<LocationPing> getByPatient(String patientId) {
        if (patientId == null || patientId.isEmpty()) {
            return repo.findAll();
        }
        return repo.findByPatientIdOrderByTimestampDesc(patientId);
    }

    // ================= CLUSTERS =================
    public List<double[]> getClusters(String patientId) {
        if (patientId == null || patientId.isEmpty()) {
            return List.of();
        }
        return logic.detectClusters(patientId);
    }

    // ================= DANGER DURATION =================
    public long getDangerDurationMinutes(String patientId) {
        if (patientId == null || patientId.isEmpty()) {
            return 0;
        }
        return logic.getDangerDurationMinutes(patientId);
    }

    public String getDangerLevel(long minutes) {
        return logic.getDangerLevel(minutes);
    }

    // ================= GET LATEST =================
    public LocationPing getLatest(String patientId) {

        if (patientId == null || patientId.isEmpty()) {
            return null;
        }
        return getLatestInternal(patientId);
    }

    private LocationPing getLatestInternal(String patientId) {

        List<LocationPing> list =
                repo.findByPatientIdOrderByTimestampDesc(patientId);

        if (list.isEmpty()) return null;

        return logic.processPing(list.get(0));
    }

    // ================= HIGH RISK =================
    public List<LocationPing> getHighRiskPatients() {
        return repo.findHighRiskPatients();
    }

    // ================= UNSAFE =================
    public List<LocationPing> getUnsafePatients() {
        return repo.findUnsafePatients();
    }

    // ================= INACTIVE =================
    public List<LocationPing> getInactivePatients() {

        LocalDateTime limit = LocalDateTime.now().minusMinutes(30);

        return repo.findInactiveSince(limit);
    }

    public List<LocationPing> getLatestPerPatient() {

        List<String> patientIds = repo.findDistinctPatientIds();

        List<LocationPing> result = new java.util.ArrayList<>();

        for (String patientId : patientIds) {

            LocationPing latest = getLatestInternal(patientId);

            if (latest != null) {
                result.add(latest);
            }
        }

        return result;
    }

    // ================= UPDATE =================
    public LocationPing update(Long id, LocationPing newData) {

        LocationPing existing = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("LocationPing not found"));

        existing.setLat(newData.getLat());
        existing.setLng(newData.getLng());

        existing = logic.processPing(existing);

        return repo.save(existing);
    }

    // ================= DELETE =================
    public void delete(Long id) {
        repo.deleteById(id);
    }
}
