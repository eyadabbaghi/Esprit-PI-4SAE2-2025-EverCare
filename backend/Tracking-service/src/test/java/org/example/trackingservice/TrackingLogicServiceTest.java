package org.example.trackingservice;

import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.entities.SavedPlace;
import org.example.trackingservice.repositories.LocationPingRepository;
import org.example.trackingservice.repositories.SavedPlaceRepository;
import org.example.trackingservice.services.TrackingLogicService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class TrackingLogicServiceTest {

    private LocationPingRepository locationRepo;
    private SavedPlaceRepository placeRepo;

    private TrackingLogicService service;

    @BeforeEach
    void setUp() {
        locationRepo = mock(LocationPingRepository.class);
        placeRepo = mock(SavedPlaceRepository.class);

        service = new TrackingLogicService(locationRepo, placeRepo);
    }

    // ================= SAFE ZONE =================
    @Test
    void shouldBeInsideSafeZone() {

        LocationPing ping = ping("P1", 36.0, 10.0);

        SavedPlace place = safeZone("P1", 36.0, 10.0, 100.0);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of(place));
        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of());

        LocationPing result = service.processPing(ping);

        assertTrue(result.getInsideSafeZone());
        assertEquals(0, result.getRiskScore());
    }

    // ================= DISTANCE =================
    @Test
    void shouldReturnDistanceFromNearestSafeZoneBoundary() {

        LocationPing ping = ping("P1", 36.0010, 10.0);

        SavedPlace place = safeZone("P1", 36.0, 10.0, 100.0);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of(place));

        double distance = service.getDistanceFromNearestSafeZone(ping);

        assertTrue(distance > 5);
        assertTrue(distance < 20);
    }

    // ================= OUTSIDE SAFE ZONE =================
    @Test
    void shouldIncreaseRiskGraduallyWhenOutsideSafeZone() {

        LocationPing ping = ping("P1", 36.0010, 10.0);

        SavedPlace place = safeZone("P1", 36.0, 10.0, 100.0);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of(place));
        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of());

        LocationPing result = service.processPing(ping);

        assertFalse(result.getInsideSafeZone());
        assertTrue(result.getRiskScore() >= 25);
        assertTrue(result.getRiskScore() < 40);
    }

    // ================= IDLE =================
    @Test
    void shouldAddIdleBonusToDynamicRisk() {

        LocationPing prev = ping("P1", 36.0010, 10.0);
        prev.setTimestamp(LocalDateTime.now().minusSeconds(10));

        LocationPing current = ping("P1", 36.00101, 10.00001);

        SavedPlace place = safeZone("P1", 36.0, 10.0, 100.0);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of(place));
        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(prev));

        LocationPing result = service.processPing(current);

        assertTrue(result.getRiskScore() >= 35);
        assertTrue(result.getRiskFactors().contains("Idle too long"));
    }

    // ================= SPEED =================
    @Test
    void shouldCalculateSpeed() {

        LocationPing prev = ping("P1", 36.0, 10.0);
        prev.setTimestamp(LocalDateTime.now().minusSeconds(10));

        LocationPing current = ping("P1", 36.1, 10.1);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of());
        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(prev));

        LocationPing result = service.processPing(current);

        assertTrue(result.getSpeed() > 0);
        assertEquals(100, result.getRiskScore());
    }

    // ================= HIGH RISK =================
    @Test
    void shouldCapRiskAt100WhenFarFromSafeZones() {

        LocationPing prev = ping("P1", 0.0, 0.0);
        prev.setTimestamp(LocalDateTime.now().minusSeconds(10));

        LocationPing current = ping("P1", 50.0, 50.0);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of());
        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(prev));

        LocationPing result = service.processPing(current);

        assertEquals(100, result.getRiskScore());
    }

    // ================= CLUSTERS =================
    @Test
    void shouldDetectFrequentClusterAndIgnoreNoise() {

        LocationPing p1 = ping("P1", 36.80000, 10.10000);
        LocationPing p2 = ping("P1", 36.80010, 10.10005);
        LocationPing p3 = ping("P1", 36.79995, 10.10002);
        LocationPing noise = ping("P1", 36.90000, 10.20000);

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(p1, p2, p3, noise));

        List<double[]> clusters = service.detectClusters("P1");

        assertEquals(1, clusters.size());
        assertTrue(clusters.get(0)[0] > 36.79 && clusters.get(0)[0] < 36.81);
        assertTrue(clusters.get(0)[1] > 10.09 && clusters.get(0)[1] < 10.11);
    }

    @Test
    void shouldKeepClusterDetectionWhileUsingDynamicRisk() {

        LocationPing history1 = ping("P1", 36.80000, 10.10000);
        LocationPing history2 = ping("P1", 36.80008, 10.10003);
        LocationPing history3 = ping("P1", 36.79996, 10.10001);
        LocationPing current = ping("P1", 36.80040, 10.10002);

        SavedPlace place = safeZone("P1", 36.80000, 10.10000, 20.0);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of(place));
        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(history1, history2, history3));

        LocationPing result = service.processPing(current);

        assertFalse(result.getInsideSafeZone());
        assertTrue(service.isInsideCluster(current));
        assertTrue(result.getRiskScore() > 20);
        assertTrue(result.getRiskFactors().contains("Inside frequent zone"));
    }

    // ================= DANGER DURATION =================
    @Test
    void shouldReturnZeroDangerDurationWhenNoHistory() {

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of());

        assertEquals(0, service.getDangerDurationMinutes("P1"));
    }

    @Test
    void shouldReturnZeroDangerDurationWhenLatestPingIsSafe() {

        LocationPing latest = riskPingAt("P1", 40, LocalDateTime.now());
        LocationPing previous = riskPingAt("P1", 90, LocalDateTime.now().minusMinutes(5));

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(latest, previous));

        assertEquals(0, service.getDangerDurationMinutes("P1"));
    }

    @Test
    void shouldReturnDurationForLatestContinuousDangerSequence() {

        LocalDateTime now = LocalDateTime.now();
        LocationPing latest = riskPingAt("P1", 90, now);
        LocationPing mid = riskPingAt("P1", 85, now.minusMinutes(4));
        LocationPing oldestDanger = riskPingAt("P1", 70, now.minusMinutes(9));
        LocationPing safeBefore = riskPingAt("P1", 50, now.minusMinutes(12));

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(latest, mid, oldestDanger, safeBefore));

        assertEquals(9, service.getDangerDurationMinutes("P1"));
    }

    @Test
    void shouldReturnZeroMinutesForSingleDangerPing() {

        LocationPing latest = riskPingAt("P1", 80, LocalDateTime.now());

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(latest));

        assertEquals(0, service.getDangerDurationMinutes("P1"));
    }

    // ================= TREND =================
    @Test
    void shouldReturnCriticalTrendWhenCurrentRiskIsVeryHigh() {

        LocationPing current = ping("P1", 36.0, 10.0);
        current.setRiskScore(95);

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(
                        riskPing("P1", 70),
                        riskPing("P1", 60),
                        riskPing("P1", 40),
                        riskPing("P1", 20)
                ));

        assertEquals("CRITICAL", service.calculateTrendDirect(current));
    }

    @Test
    void shouldReturnWorseningTrendWhenCurrentRiskIsHighEvenIfHistoryLooksBetter() {

        LocationPing current = ping("P1", 36.0, 10.0);
        current.setRiskScore(65);

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(
                        riskPing("P1", 50),
                        riskPing("P1", 45),
                        riskPing("P1", 90),
                        riskPing("P1", 85),
                        riskPing("P1", 80)
                ));

        assertEquals("WORSENING", service.calculateTrendDirect(current));
    }

    @Test
    void shouldReturnStableTrendWhenCurrentRiskIsZero() {

        LocationPing current = ping("P1", 36.0, 10.0);
        current.setRiskScore(0);

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(
                        riskPing("P1", 30),
                        riskPing("P1", 20),
                        riskPing("P1", 10),
                        riskPing("P1", 15)
                ));

        assertEquals("STABLE", service.calculateTrendDirect(current));
    }

    @Test
    void shouldReturnWorseningWhenRecentAverageIsHigherThanOlderAverage() {

        LocationPing current = ping("P1", 36.0, 10.0);
        current.setRiskScore(45);

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(
                        riskPing("P1", 50),
                        riskPing("P1", 40),
                        riskPing("P1", 15),
                        riskPing("P1", 10),
                        riskPing("P1", 20)
                ));

        assertEquals("WORSENING", service.calculateTrendDirect(current));
    }

    @Test
    void shouldReturnImprovingWhenRecentAverageIsLowerThanOlderAverage() {

        LocationPing current = ping("P1", 36.0, 10.0);
        current.setRiskScore(20);

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(
                        riskPing("P1", 25),
                        riskPing("P1", 20),
                        riskPing("P1", 45),
                        riskPing("P1", 40),
                        riskPing("P1", 35)
                ));

        assertEquals("IMPROVING", service.calculateTrendDirect(current));
    }

    @Test
    void shouldReturnStableWhenDifferenceIsSmall() {

        LocationPing current = ping("P1", 36.0, 10.0);
        current.setRiskScore(30);

        when(locationRepo.findTop100ByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(
                        riskPing("P1", 31),
                        riskPing("P1", 29),
                        riskPing("P1", 28),
                        riskPing("P1", 30),
                        riskPing("P1", 29)
                ));

        assertEquals("STABLE", service.calculateTrendDirect(current));
    }

    private LocationPing ping(String patientId, double lat, double lng) {
        LocationPing ping = new LocationPing();
        ping.setPatientId(patientId);
        ping.setLat(lat);
        ping.setLng(lng);
        ping.setTimestamp(LocalDateTime.now());
        return ping;
    }

    private SavedPlace safeZone(String patientId, double lat, double lng, double radius) {
        SavedPlace place = new SavedPlace();
        place.setPatientId(patientId);
        place.setLat(lat);
        place.setLng(lng);
        place.setRadius(radius);
        return place;
    }

    private LocationPing riskPing(String patientId, int riskScore) {
        LocationPing ping = ping(patientId, 36.0, 10.0);
        ping.setRiskScore(riskScore);
        return ping;
    }

    private LocationPing riskPingAt(String patientId, int riskScore, LocalDateTime timestamp) {
        LocationPing ping = ping(patientId, 36.0, 10.0);
        ping.setRiskScore(riskScore);
        ping.setTimestamp(timestamp);
        return ping;
    }
}
