package tn.esprit.alerts.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.alerts.dto.AlertRequest;
import tn.esprit.alerts.dto.AlertResponse;
import tn.esprit.alerts.entity.Alert;
import tn.esprit.alerts.entity.AlertStatus;
import tn.esprit.alerts.entity.Incident;
import tn.esprit.alerts.exception.ResourceNotFoundException;
import tn.esprit.alerts.repository.AlertRepository;
import tn.esprit.alerts.repository.IncidentRepository;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final IncidentRepository incidentRepository;

    @Transactional
    public AlertResponse createAlert(AlertRequest request) {
        Incident incident = incidentRepository.findById(request.getIncidentId())
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + request.getIncidentId()));

        Alert alert = Alert.builder()
                .incident(incident)
                .senderId(request.getSenderId())
                .targetId(request.getTargetId())
                .status(AlertStatus.SENT)   // initial status (will be changed when actually sent)
                .label(request.getLabel())
                .build();

        if (request.getImmediate() != null && request.getImmediate()) {
            // Immediate alert – set sentAt to now
            alert.setSentAt(LocalDateTime.now());
        } else {
            // Scheduled alert – store schedule info, sentAt remains null
            if (request.getScheduledTime() != null) {
                alert.setScheduledTime(LocalTime.parse(request.getScheduledTime()));
            }
            if (request.getRepeatDays() != null) {
                alert.setRepeatDays(new HashSet<>(request.getRepeatDays()));
            }
        }

        alert = alertRepository.save(alert);
        return mapToResponse(alert);
    }

    @Transactional(readOnly = true)
    public AlertResponse getAlert(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        return mapToResponse(alert);
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getAlertsByIncident(String incidentId) {
        return alertRepository.findByIncident_IncidentId(incidentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AlertResponse acknowledgeAlert(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert = alertRepository.save(alert);
        return mapToResponse(alert);
    }

    @Transactional
    public AlertResponse resolveAlert(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        alert.setStatus(AlertStatus.RESOLVED);
        // resolve time? maybe separate field
        alert = alertRepository.save(alert);
        return mapToResponse(alert);
    }

    @Transactional
    public void deleteAlert(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        alertRepository.delete(alert);
    }

    public AlertResponse mapToResponse(Alert alert) {
        AlertResponse response = new AlertResponse();
        response.setAlertId(alert.getAlertId());
        response.setIncidentId(alert.getIncident().getIncidentId());
        response.setSenderId(alert.getSenderId());
        response.setTargetId(alert.getTargetId());
        response.setStatus(alert.getStatus().name());
        response.setSentAt(alert.getSentAt());
        response.setAcknowledgedAt(alert.getAcknowledgedAt());
        response.setLabel(alert.getLabel());
        if (alert.getScheduledTime() != null) {
            response.setScheduledTime(alert.getScheduledTime().toString()); // "HH:mm"
        }
        if (alert.getRepeatDays() != null) {
            response.setRepeatDays(new ArrayList<>(alert.getRepeatDays()));
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getAllAlerts() {
        return alertRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AlertResponse updateAlert(String id, AlertRequest request) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));

        // Update fields
        alert.setTargetId(request.getTargetId());
        alert.setLabel(request.getLabel());

        // Handle schedule
        if (request.getImmediate() != null && request.getImmediate()) {
            alert.setScheduledTime(null);
            alert.setRepeatDays(new HashSet<>());
            // Optionally set sentAt if immediate and not already sent? For simplicity, we leave sentAt as is.
        } else {
            alert.setScheduledTime(request.getScheduledTime() != null ? LocalTime.parse(request.getScheduledTime()) : null);
            alert.setRepeatDays(request.getRepeatDays() != null ? new HashSet<>(request.getRepeatDays()) : new HashSet<>());
        }

        // Status can be updated (if request includes status)
        if (request.getStatus() != null) {
            alert.setStatus(AlertStatus.valueOf(request.getStatus()));
        }

        alert = alertRepository.save(alert);
        return mapToResponse(alert);
    }
}