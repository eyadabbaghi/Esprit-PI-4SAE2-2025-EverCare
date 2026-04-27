package org.example.trackingservice;

import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.repositories.LocationPingRepository;
import org.example.trackingservice.services.LocationPingService;
import org.example.trackingservice.services.PatientValidationService;
import org.example.trackingservice.services.TrackingLogicService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LocationPingServiceTest {

    @Mock
    private LocationPingRepository repo;

    @Mock
    private TrackingLogicService logic;

    @Mock
    private PatientValidationService patientValidationService;

    @InjectMocks
    private LocationPingService service;

    @Test
    void addShouldValidatePatientBeforeSavingProcessedPing() {

        LocationPing ping = ping("P1");
        LocationPing processedPing = ping("P1");
        processedPing.setRiskScore(40);

        when(logic.processPing(ping)).thenReturn(processedPing);
        when(repo.save(processedPing)).thenReturn(processedPing);

        LocationPing saved = service.add(ping);

        verify(patientValidationService).validatePatientExists("P1");
        verify(logic).processPing(ping);
        verify(repo).save(processedPing);
        assertSame(processedPing, saved);
    }

    @Test
    void getByPatientShouldValidatePatientBeforeReadingHistory() {

        LocationPing latest = ping("P1");
        when(repo.findByPatientIdOrderByTimestampDesc("P1")).thenReturn(List.of(latest));

        List<LocationPing> history = service.getByPatient("P1");

        verify(patientValidationService).validatePatientExists("P1");
        assertEquals(1, history.size());
        assertSame(latest, history.get(0));
    }

    private LocationPing ping(String patientId) {
        LocationPing ping = new LocationPing();
        ping.setPatientId(patientId);
        ping.setLat(36.8);
        ping.setLng(10.1);
        ping.setTimestamp(LocalDateTime.now());
        return ping;
    }
}
