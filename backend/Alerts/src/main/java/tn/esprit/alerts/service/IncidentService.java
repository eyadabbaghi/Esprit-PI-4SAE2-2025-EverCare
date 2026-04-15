package tn.esprit.alerts.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.alerts.dto.IncidentRequest;
import tn.esprit.alerts.dto.IncidentResponse;
import tn.esprit.alerts.entity.Incident;
import tn.esprit.alerts.entity.IncidentStatus;
import tn.esprit.alerts.entity.Severity;
import tn.esprit.alerts.exception.ResourceNotFoundException;
import tn.esprit.alerts.repository.IncidentRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final AlertService alertService;

    @Transactional
    public IncidentResponse createIncident(IncidentRequest request) {
        Incident incident = Incident.builder()
                .title(request.getTitle())
                .type(request.getType())
                .description(request.getDescription())
                .severity(Severity.valueOf(request.getSeverity()))
                .status(IncidentStatus.OPEN)
                .reportedByUserId(request.getReportedByUserId())
                .patientId(request.getPatientId())   // <-- added
                .location(request.getLocation())
                .build();
        incident = incidentRepository.save(incident);
        return mapToResponse(incident);
    }

    @Transactional(readOnly = true)
    public IncidentResponse getIncident(String id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));
        return mapToResponse(incident);
    }

    @Transactional(readOnly = true)
    public List<IncidentResponse> getAllIncidents() {
        return incidentRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public IncidentResponse updateIncident(String id, IncidentRequest request) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));
        incident.setTitle(request.getTitle());
        incident.setType(request.getType());
        incident.setDescription(request.getDescription());
        incident.setSeverity(Severity.valueOf(request.getSeverity()));
        incident.setLocation(request.getLocation());
        incident.setPatientId(request.getPatientId());   // <-- added
        incident = incidentRepository.save(incident);
        return mapToResponse(incident);
    }

    @Transactional
    public void deleteIncident(String id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));
        incidentRepository.delete(incident);
    }

    @Transactional
    public IncidentResponse resolveIncident(String id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));
        incident.setStatus(IncidentStatus.RESOLVED);
        incident = incidentRepository.save(incident);
        return mapToResponse(incident);
    }

    private IncidentResponse mapToResponse(Incident incident) {
        IncidentResponse response = new IncidentResponse();
        response.setIncidentId(incident.getIncidentId());
        response.setTitle(incident.getTitle());
        response.setType(incident.getType());
        response.setDescription(incident.getDescription());
        response.setSeverity(incident.getSeverity().name());
        response.setStatus(incident.getStatus().name());
        response.setIncidentDate(incident.getIncidentDate());
        response.setReportedByUserId(incident.getReportedByUserId());
        response.setPatientId(incident.getPatientId());   // <-- added
        response.setLocation(incident.getLocation());
        if (incident.getAlerts() != null) {
            response.setAlerts(incident.getAlerts().stream()
                    .map(alertService::mapToResponse)
                    .collect(Collectors.toList()));
        }
        return response;
    }
}