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

        LocationPing ping = new LocationPing();
        ping.setPatientId("P1");
        ping.setLat(36.0);
        ping.setLng(10.0);
        ping.setTimestamp(LocalDateTime.now());

        SavedPlace place = new SavedPlace();
        place.setLat(36.0);
        place.setLng(10.0);
        place.setRadius(100.0);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of(place));
        when(locationRepo.findByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of());

        LocationPing result = service.processPing(ping);

        assertTrue(result.getInsideSafeZone());
    }

    // ================= OUTSIDE SAFE ZONE =================
    @Test
    void shouldBeOutsideSafeZone() {

        LocationPing ping = new LocationPing();
        ping.setPatientId("P1");
        ping.setLat(36.0);
        ping.setLng(10.0);
        ping.setTimestamp(LocalDateTime.now());

        SavedPlace place = new SavedPlace();
        place.setLat(50.0); // far
        place.setLng(50.0);
        place.setRadius(100.0);

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of(place));
        when(locationRepo.findByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of());

        LocationPing result = service.processPing(ping);

        assertFalse(result.getInsideSafeZone());
    }

    // ================= IDLE =================
    @Test
    void shouldDetectIdle() {

        LocationPing prev = new LocationPing();
        prev.setLat(36.0);
        prev.setLng(10.0);
        prev.setTimestamp(LocalDateTime.now().minusSeconds(10));

        LocationPing current = new LocationPing();
        current.setPatientId("P1");
        current.setLat(36.00001);
        current.setLng(10.00001);
        current.setTimestamp(LocalDateTime.now());

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of());
        when(locationRepo.findByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(prev));

        LocationPing result = service.processPing(current);

        assertTrue(result.getRiskScore() >= 30); // idle adds risk
    }

    // ================= SPEED =================
    @Test
    void shouldCalculateSpeed() {

        LocationPing prev = new LocationPing();
        prev.setLat(36.0);
        prev.setLng(10.0);
        prev.setTimestamp(LocalDateTime.now().minusSeconds(10));

        LocationPing current = new LocationPing();
        current.setPatientId("P1");
        current.setLat(36.1);
        current.setLng(10.1);
        current.setTimestamp(LocalDateTime.now());

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of());
        when(locationRepo.findByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(prev));

        LocationPing result = service.processPing(current);

        assertTrue(result.getSpeed() > 0);
    }

    // ================= HIGH RISK =================
    @Test
    void shouldGenerateHighRisk() {

        LocationPing prev = new LocationPing();
        prev.setLat(0.0);
        prev.setLng(0.0);
        prev.setTimestamp(LocalDateTime.now().minusSeconds(10));

        LocationPing current = new LocationPing();
        current.setPatientId("P1");
        current.setLat(50.0);
        current.setLng(50.0);
        current.setTimestamp(LocalDateTime.now());

        when(placeRepo.findByPatientId("P1")).thenReturn(List.of()); // no safe zone
        when(locationRepo.findByPatientIdOrderByTimestampDesc("P1"))
                .thenReturn(List.of(prev));

        LocationPing result = service.processPing(current);

        assertTrue(result.getRiskScore() >= 50);
    }
}
