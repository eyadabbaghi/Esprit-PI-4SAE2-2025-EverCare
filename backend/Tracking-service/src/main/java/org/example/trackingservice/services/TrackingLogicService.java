package org.example.trackingservice.services;

import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.entities.SavedPlace;
import org.example.trackingservice.repositories.LocationPingRepository;
import org.example.trackingservice.repositories.SavedPlaceRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
public class TrackingLogicService {

    private final LocationPingRepository locationRepo;
    private final SavedPlaceRepository placeRepo;

    public TrackingLogicService(LocationPingRepository locationRepo,
                                SavedPlaceRepository placeRepo) {
        this.locationRepo = locationRepo;
        this.placeRepo = placeRepo;
    }

    public LocationPing processPing(LocationPing ping) {

        boolean inside = isInsideSafeZone(ping);
        ping.setInsideSafeZone(inside);

        double speed = calculateSpeed(ping);
        ping.setSpeed(speed);

        boolean idle = isIdle(ping);

        RiskResult risk = calculateRisk(ping, idle);
        ping.setRiskScore(risk.score);
        ping.setRiskFactors(risk.factors);

        String trend = calculateTrend(ping);
        ping.setTrend(trend);

        return ping;
    }

    // ================= SAFE ZONE =================
    private boolean isInsideSafeZone(LocationPing ping) {

        List<SavedPlace> places =
                placeRepo.findByPatientId(ping.getPatientId());

        for (SavedPlace place : places) {

            double dist = distance(
                    ping.getLat(), ping.getLng(),
                    place.getLat(), place.getLng()
            );

            if (dist <= place.getRadius()) return true;
        }

        return false;
    }

    // ================= SPEED =================
    private double calculateSpeed(LocationPing current) {

        List<LocationPing> list =
                locationRepo.findByPatientIdOrderByTimestampDesc(current.getPatientId());

        if (list.size() < 2) return 0;

        LocationPing prev = list.get(1);

        double dist = distance(
                current.getLat(), current.getLng(),
                prev.getLat(), prev.getLng()
        );

        long seconds = Duration
                .between(prev.getTimestamp(), current.getTimestamp())
                .getSeconds();

        if (seconds == 0) return 0;

        return dist / seconds;
    }
    public boolean isInsideSafeZoneDirect(LocationPing ping) {

        List<SavedPlace> places =
                placeRepo.findByPatientId(ping.getPatientId());

        for (SavedPlace place : places) {

            double dist = distance(
                    ping.getLat(), ping.getLng(),
                    place.getLat(), place.getLng()
            );

            if (dist <= place.getRadius()) return true;
        }

        return false;
    }

    // ================= IDLE =================
    private boolean isIdle(LocationPing current) {

        List<LocationPing> list =
                locationRepo.findByPatientIdOrderByTimestampDesc(current.getPatientId());

        if (list.size() < 2) return false;

        LocationPing prev = list.get(1);

        double dist = distance(
                current.getLat(), current.getLng(),
                prev.getLat(), prev.getLng()
        );

        return dist < 5;
    }

    // ================= RISK =================
    private RiskResult calculateRisk(LocationPing ping, boolean idle) {

        int risk = 0;
        List<String> factors = new java.util.ArrayList<>();

        if (!ping.getInsideSafeZone()) {
            risk += 50;
            factors.add("Outside safe zone");
        }
        if (idle) {
            risk += 30;
            factors.add("Idle too long");
        }
        if (ping.getSpeed() > 10) {
            risk += 20;
            factors.add("High speed");
        }

        return new RiskResult(Math.min(risk, 100), factors);
    }

    // ================= TREND =================
    private String calculateTrend(LocationPing current) {
        List<LocationPing> history =
                locationRepo.findByPatientIdOrderByTimestampDesc(current.getPatientId());

        List<LocationPing> combined = new java.util.ArrayList<>();
        combined.add(current);
        if (!history.isEmpty() && history.get(0).getId() != null && history.get(0).getId().equals(current.getId())) {
            combined.addAll(history.subList(1, history.size()));
        } else {
            combined.addAll(history);
        }

        if (combined.size() < 2) return "STABLE";
        if ((current.getRiskScore() != null && current.getRiskScore() == 0)) return "STABLE";

        int midpoint = combined.size() / 2;
        if (midpoint == 0) return "STABLE";

        double firstAvg = averageRisk(combined.subList(0, midpoint));
        double secondAvg = averageRisk(combined.subList(midpoint, combined.size()));

        if (secondAvg > firstAvg) return "WORSENING";
        if (secondAvg < firstAvg) return "IMPROVING";
        return "STABLE";
    }

    public String calculateTrendDirect(LocationPing current) {
        return calculateTrend(current);
    }

    private double averageRisk(List<LocationPing> points) {
        if (points.isEmpty()) return 0;
        double total = 0;
        for (LocationPing p : points) {
            total += p.getRiskScore() == null ? 0 : p.getRiskScore();
        }
        return total / points.size();
    }

    private static class RiskResult {
        final int score;
        final List<String> factors;

        RiskResult(int score, List<String> factors) {
            this.score = score;
            this.factors = factors;
        }
    }

    // ================= DISTANCE =================
    private double distance(double lat1, double lon1, double lat2, double lon2) {

        double R = 6371000;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat/2)*Math.sin(dLat/2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon/2)*Math.sin(dLon/2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }
}
