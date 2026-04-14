package org.example.trackingservice.services;

import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.entities.SavedPlace;
import org.example.trackingservice.repositories.LocationPingRepository;
import org.example.trackingservice.repositories.SavedPlaceRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class TrackingLogicService {

    private static final double CLUSTER_DISTANCE_METERS = 50.0;
    private static final int MIN_CLUSTER_POINTS = 3;
    private static final int BASE_OUTSIDE_SAFE_ZONE_RISK = 20;
    private static final double DISTANCE_STEP_METERS = 5.0;
    private static final int DISTANCE_STEP_RISK = 5;

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
        boolean insideCluster = !inside && isInsideCluster(ping);

        RiskResult risk = calculateRisk(ping, insideCluster, idle);
        ping.setRiskScore(risk.score);
        ping.setRiskFactors(risk.factors);

        String trend = calculateTrend(ping);
        ping.setTrend(trend);

        return ping;
    }

    // ================= SAFE ZONE =================
    private boolean isInsideSafeZone(LocationPing ping) {

        if (!hasCoordinates(ping)) return false;

        List<SavedPlace> places =
                placeRepo.findByPatientId(ping.getPatientId());

        for (SavedPlace place : places) {

            if (place.getLat() == null || place.getLng() == null || place.getRadius() == null) {
                continue;
            }

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

        LocationPing prev = getPreviousPing(current);

        if (prev == null) return 0;
        if (!hasCoordinates(current) || !hasCoordinates(prev)) return 0;
        if (current.getTimestamp() == null || prev.getTimestamp() == null) return 0;

        double dist = distance(
                current.getLat(), current.getLng(),
                prev.getLat(), prev.getLng()
        );

        long seconds = Duration
                .between(prev.getTimestamp(), current.getTimestamp())
                .getSeconds();

        if (seconds <= 0) return 0;

        return dist / seconds;
    }

    public boolean isInsideSafeZoneDirect(LocationPing ping) {
        return isInsideSafeZone(ping);
    }

    // ================= IDLE =================
    private boolean isIdle(LocationPing current) {

        LocationPing prev = getPreviousPing(current);

        if (prev == null) return false;
        if (!hasCoordinates(current) || !hasCoordinates(prev)) return false;

        double dist = distance(
                current.getLat(), current.getLng(),
                prev.getLat(), prev.getLng()
        );

        return dist < 5;
    }

    // ================= RISK =================
    private RiskResult calculateRisk(LocationPing ping, boolean insideCluster, boolean idle) {

        int risk;
        List<String> factors = new ArrayList<>();

        if (Boolean.TRUE.equals(ping.getInsideSafeZone())) {
            return new RiskResult(0, factors);
        }

        double nearestDistance = getDistanceFromNearestSafeZone(ping);

        if (nearestDistance == Double.MAX_VALUE) {
            risk = 100;
            factors.add("Outside safe zone");
            factors.add("No safe zones configured");
        } else {
            double dynamicRisk =
                    BASE_OUTSIDE_SAFE_ZONE_RISK
                            + (nearestDistance / DISTANCE_STEP_METERS) * DISTANCE_STEP_RISK;

            risk = (int) Math.round(dynamicRisk);
            factors.add("Outside safe zone");
            factors.add("Nearest safe zone: " + Math.round(nearestDistance) + "m");
        }

        if (insideCluster) {
            factors.add("Inside frequent zone");
        }

        if (idle) {
            risk += 10;
            factors.add("Idle too long");
        }
        if (ping.getSpeed() != null && ping.getSpeed() > 10) {
            risk += 20;
            factors.add("High speed");
        }

        return new RiskResult(Math.min(risk, 100), factors);
    }

    public double getDistanceFromNearestSafeZone(LocationPing ping) {

        if (!hasCoordinates(ping)) return Double.MAX_VALUE;

        List<SavedPlace> places = placeRepo.findByPatientId(ping.getPatientId());
        double nearestDistance = Double.MAX_VALUE;

        for (int i = 0; i < places.size(); i++) {
            SavedPlace place = places.get(i);

            if (place.getLat() == null || place.getLng() == null || place.getRadius() == null) {
                continue;
            }

            double centerDistance = distance(
                    ping.getLat(), ping.getLng(),
                    place.getLat(), place.getLng()
            );

            double distanceFromZone = centerDistance - place.getRadius();

            if (distanceFromZone < 0) {
                distanceFromZone = 0;
            }

            if (distanceFromZone < nearestDistance) {
                nearestDistance = distanceFromZone;
            }
        }

        return nearestDistance;
    }

    // ================= CLUSTERS =================
    public List<double[]> detectClusters(String patientId) {

        List<LocationPing> history = getRecentHistory(patientId);
        List<ClusterAccumulator> clusters = new ArrayList<>();

        for (int i = 0; i < history.size(); i++) {
            LocationPing ping = history.get(i);

            if (!hasCoordinates(ping)) {
                continue;
            }

            boolean added = false;

            for (int j = 0; j < clusters.size(); j++) {
                ClusterAccumulator cluster = clusters.get(j);

                double dist = distance(
                        ping.getLat(), ping.getLng(),
                        cluster.getLat(), cluster.getLng()
                );

                if (dist <= CLUSTER_DISTANCE_METERS) {
                    cluster.addPoint(ping.getLat(), ping.getLng());
                    added = true;
                    break;
                }
            }

            if (!added) {
                clusters.add(new ClusterAccumulator(ping.getLat(), ping.getLng()));
            }
        }

        List<double[]> result = new ArrayList<>();

        for (int i = 0; i < clusters.size(); i++) {
            ClusterAccumulator cluster = clusters.get(i);

            if (cluster.getPointCount() >= MIN_CLUSTER_POINTS) {
                result.add(new double[]{cluster.getLat(), cluster.getLng()});
            }
        }

        return result;
    }

    public boolean isInsideCluster(LocationPing ping) {

        if (!hasCoordinates(ping)) return false;

        List<double[]> clusters = detectClusters(ping.getPatientId());

        for (int i = 0; i < clusters.size(); i++) {
            double[] cluster = clusters.get(i);

            double dist = distance(
                    ping.getLat(), ping.getLng(),
                    cluster[0], cluster[1]
            );

            if (dist < CLUSTER_DISTANCE_METERS) {
                return true;
            }
        }

        return false;
    }

    // ================= DANGER TIMER =================
    public long getDangerDurationMinutes(String patientId) {

        List<LocationPing> history = getRecentHistory(patientId);

        if (history.isEmpty()) return 0;

        LocationPing latest = history.get(0);

        if (latest.getRiskScore() == null || latest.getRiskScore() < 70) return 0;
        if (latest.getTimestamp() == null) return 0;

        LocalDateTime latestTimestamp = latest.getTimestamp();
        LocalDateTime oldestDangerousTimestamp = latestTimestamp;

        for (int i = 1; i < history.size(); i++) {
            LocationPing ping = history.get(i);

            if (ping.getRiskScore() == null || ping.getRiskScore() < 70) {
                break;
            }

            if (ping.getTimestamp() == null) {
                continue;
            }

            oldestDangerousTimestamp = ping.getTimestamp();
        }

        long duration = Duration.between(oldestDangerousTimestamp, latestTimestamp).toMinutes();
        return Math.max(duration, 0);
    }

    public String getDangerLevel(long minutes) {
        if (minutes < 5) return "LOW";
        if (minutes <= 15) return "MEDIUM";
        return "CRITICAL";
    }

    // ================= TREND =================
    private String calculateTrend(LocationPing current) {

        List<LocationPing> history = getRecentHistory(current.getPatientId());
        List<LocationPing> combined = new ArrayList<>();

        combined.add(current);

        for (int i = 0; i < history.size(); i++) {
            LocationPing ping = history.get(i);

            if (current.getId() != null
                    && ping.getId() != null
                    && ping.getId().equals(current.getId())) {
                continue;
            }

            combined.add(ping);
        }

        if (current.getRiskScore() != null) {
            if (current.getRiskScore() >= 80) return "CRITICAL";
            if (current.getRiskScore() >= 60) return "WORSENING";
            if (current.getRiskScore() == 0) return "STABLE";
        }

        List<LocationPing> recentPoints = new ArrayList<>();
        List<LocationPing> olderPoints = new ArrayList<>();

        for (int i = 0; i < combined.size() && i < 6; i++) {
            if (i < 3) {
                recentPoints.add(combined.get(i));
            } else {
                olderPoints.add(combined.get(i));
            }
        }

        if (recentPoints.isEmpty() || olderPoints.isEmpty()) return "STABLE";

        double recentAvg = averageRisk(recentPoints);
        double olderAvg = averageRisk(olderPoints);
        double difference = recentAvg - olderAvg;

        if (Math.abs(difference) < 5) return "STABLE";
        if (difference > 0) return "WORSENING";
        if (current.getRiskScore() != null && current.getRiskScore() >= 60) return "WORSENING";
        if (difference < 0) return "IMPROVING";
        return "STABLE";
    }

    public String calculateTrendDirect(LocationPing current) {
        return calculateTrend(current);
    }

    private double averageRisk(List<LocationPing> points) {
        if (points.isEmpty()) return 0;

        double total = 0;

        for (int i = 0; i < points.size(); i++) {
            LocationPing ping = points.get(i);
            total += ping.getRiskScore() == null ? 0 : ping.getRiskScore();
        }

        return total / points.size();
    }

    private List<LocationPing> getRecentHistory(String patientId) {

        if (patientId == null || patientId.isBlank()) {
            return new ArrayList<>();
        }

        return locationRepo.findTop100ByPatientIdOrderByTimestampDesc(patientId);
    }

    private LocationPing getPreviousPing(LocationPing current) {

        if (current == null || current.getPatientId() == null || current.getPatientId().isBlank()) {
            return null;
        }

        List<LocationPing> history = getRecentHistory(current.getPatientId());
        if (history.isEmpty()) return null;

        if (current.getId() != null) {
            for (int i = 0; i < history.size(); i++) {
                LocationPing ping = history.get(i);

                if (ping.getId() != null && ping.getId().equals(current.getId())) {
                    if (i + 1 < history.size()) {
                        return history.get(i + 1);
                    }
                    return null;
                }
            }
        }

        return history.get(0);
    }

    private boolean hasCoordinates(LocationPing ping) {
        return ping != null
                && ping.getLat() != null
                && ping.getLng() != null;
    }

    private static class RiskResult {
        final int score;
        final List<String> factors;

        RiskResult(int score, List<String> factors) {
            this.score = score;
            this.factors = factors;
        }
    }

    private static class ClusterAccumulator {
        private double sumLat;
        private double sumLng;
        private int pointCount;

        ClusterAccumulator(double lat, double lng) {
            this.sumLat = lat;
            this.sumLng = lng;
            this.pointCount = 1;
        }

        void addPoint(double lat, double lng) {
            sumLat += lat;
            sumLng += lng;
            pointCount++;
        }

        double getLat() {
            return sumLat / pointCount;
        }

        double getLng() {
            return sumLng / pointCount;
        }

        int getPointCount() {
            return pointCount;
        }
    }

    // ================= DISTANCE =================
    private double distance(double lat1, double lon1, double lat2, double lon2) {

        double R = 6371000;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}
