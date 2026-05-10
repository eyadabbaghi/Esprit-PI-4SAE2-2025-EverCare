package tn.esprit.alerts.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.alerts.dto.AlertRequest;
import tn.esprit.alerts.dto.AlertResponse;
import tn.esprit.alerts.entity.Alert;
import tn.esprit.alerts.entity.AlertStatus;
import tn.esprit.alerts.entity.Incident;
import tn.esprit.alerts.exception.ResourceNotFoundException;
import tn.esprit.alerts.repository.AlertRepository;
import tn.esprit.alerts.repository.IncidentRepository;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private AlertNotificationChannelService alertNotificationChannelService;

    @InjectMocks
    private AlertService alertService;

    @Test
    void createAlertWithImmediateRequestSetsSentAt() {
        AlertRequest request = new AlertRequest();
        request.setIncidentId("incident-1");
        request.setSenderId("sender-1");
        request.setTargetId("target-1");
        request.setLabel("Morning check");
        request.setImmediate(true);

        Incident incident = Incident.builder().incidentId("incident-1").title("Fall").build();

        when(incidentRepository.findById("incident-1")).thenReturn(Optional.of(incident));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> {
            Alert alert = invocation.getArgument(0);
            alert.setAlertId("alert-1");
            return alert;
        });

        AlertResponse response = alertService.createAlert(request);

        assertEquals("alert-1", response.getAlertId());
        assertEquals("incident-1", response.getIncidentId());
        assertEquals(AlertStatus.SENT.name(), response.getStatus());
        assertNotNull(response.getSentAt());
        assertNull(response.getScheduledTime());
        verify(alertRepository).save(any(Alert.class));
    }

    @Test
    void createScheduledAlertStoresScheduleFields() {
        AlertRequest request = new AlertRequest();
        request.setIncidentId("incident-1");
        request.setSenderId("sender-1");
        request.setTargetId("target-1");
        request.setImmediate(false);
        request.setScheduledTime("09:30");
        request.setRepeatDays(List.of("MON", "WED"));

        Incident incident = Incident.builder().incidentId("incident-1").title("Fall").build();

        when(incidentRepository.findById("incident-1")).thenReturn(Optional.of(incident));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AlertResponse response = alertService.createAlert(request);

        assertEquals("09:30", response.getScheduledTime());
        assertEquals(2, response.getRepeatDays().size());
        verify(alertRepository).save(any(Alert.class));
    }

    @Test
    void getAlertThrowsWhenAlertDoesNotExist() {
        when(alertRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> alertService.getAlert("missing"));
    }

    @Test
    void updateAlertSwitchesImmediateAlertToScheduled() {
        AlertRequest request = new AlertRequest();
        request.setTargetId("target-2");
        request.setLabel("Updated label");
        request.setImmediate(false);
        request.setScheduledTime("18:15");
        request.setRepeatDays(List.of("FRI"));
        request.setStatus(AlertStatus.RESOLVED.name());

        Incident incident = Incident.builder().incidentId("incident-1").title("Fall").build();
        Alert existing = Alert.builder()
                .alertId("alert-1")
                .incident(incident)
                .senderId("sender-1")
                .targetId("target-1")
                .status(AlertStatus.SENT)
                .build();

        when(alertRepository.findById("alert-1")).thenReturn(Optional.of(existing));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AlertResponse response = alertService.updateAlert("alert-1", request);

        assertEquals("target-2", response.getTargetId());
        assertEquals("Updated label", response.getLabel());
        assertEquals("18:15", response.getScheduledTime());
        assertEquals(Set.of("FRI"), Set.copyOf(response.getRepeatDays()));
        assertEquals(AlertStatus.RESOLVED.name(), response.getStatus());
    }
}
