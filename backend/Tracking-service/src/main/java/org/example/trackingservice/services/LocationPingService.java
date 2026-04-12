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

    public LocationPingService(LocationPingRepository repo,
                               TrackingLogicService logic) {
        this.repo = repo;
        this.logic = logic;
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

        ping = logic.processPing(ping);

        return repo.save(ping);
    }

    // ================= HISTORY =================
    public List<LocationPing> getByPatient(String patientId) {
        return repo.findByPatientIdOrderByTimestampDesc(patientId);
    }

    // ================= GET LATEST =================
    public LocationPing getLatest(String patientId) {

        List<LocationPing> list =
                repo.findByPatientIdOrderByTimestampDesc(patientId);

        if (list.isEmpty()) return null;

        LocationPing latest = list.get(0);

        // 🔥 ONLY recompute SAFE ZONE (NOT speed/risk)
        boolean inside = logic.isInsideSafeZoneDirect(latest);
        latest.setInsideSafeZone(inside);

        // 🔥 recompute risk ONLY based on safe zone
        int risk = inside ? 0 : 80;
        latest.setRiskScore(risk);
        if (inside) {
            latest.setRiskFactors(java.util.List.of());
        } else {
            latest.setRiskFactors(java.util.List.of("Outside safe zone"));
        }

        latest.setTrend(logic.calculateTrendDirect(latest));

        return latest;
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

            LocationPing latest = getLatest(patientId);

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
