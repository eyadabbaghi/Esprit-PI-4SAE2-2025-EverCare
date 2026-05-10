package tn.esprit.alerts.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import tn.esprit.alerts.dto.IncidentInsightsRequest;
import tn.esprit.alerts.dto.IncidentRequest;
import tn.esprit.alerts.dto.IncidentResponse;
import tn.esprit.alerts.dto.DoctorRecommendationRequest;
import tn.esprit.alerts.dto.DoctorRecommendationResponse;
import tn.esprit.alerts.entity.DoctorRecommendation;
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
    private final IncidentAiInsightsService incidentAiInsightsService;

    @Transactional
    public IncidentResponse createIncident(IncidentRequest request) {
        String aiSuggestion = resolveAiSuggestion(request);
        Incident incident = Incident.builder()
                .title(request.getTitle())
                .type(request.getType())
                .description(request.getDescription())
                .aiSuggestion(aiSuggestion)
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
        String aiSuggestion = resolveAiSuggestion(request);
        incident.setTitle(request.getTitle());
        incident.setType(request.getType());
        incident.setDescription(request.getDescription());
        incident.setAiSuggestion(aiSuggestion);
        incident.setSeverity(Severity.valueOf(request.getSeverity()));
        incident.setLocation(request.getLocation());
        incident.setPatientId(request.getPatientId());   // <-- added
        incident = incidentRepository.save(incident);
        return mapToResponse(incident);
    }

    @Transactional
    public IncidentResponse addDoctorRecommendation(String id, DoctorRecommendationRequest request) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));

        DoctorRecommendation recommendation = DoctorRecommendation.builder()
                .doctorId(request.getDoctorId())
                .doctorName(request.getDoctorName())
                .recommendation(request.getRecommendation())
                .build();

        incident.addDoctorRecommendation(recommendation);
        return mapToResponse(incidentRepository.save(incident));
    }

    @Transactional
    public void deleteIncident(String id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));
        incidentRepository.delete(incident);
    }

    public IncidentResponse acknowledgeIncident(String id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + id));
        incident.setStatus(IncidentStatus.ACKNOWLEDGED);
        return mapToResponse(incidentRepository.save(incident));
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
        response.setAiSuggestion(incident.getAiSuggestion());
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
        if (incident.getDoctorRecommendations() != null) {
            response.setDoctorRecommendations(incident.getDoctorRecommendations().stream()
                    .map(this::mapRecommendationToResponse)
                    .collect(Collectors.toList()));
        }
        return response;
    }

    private DoctorRecommendationResponse mapRecommendationToResponse(DoctorRecommendation recommendation) {
        DoctorRecommendationResponse response = new DoctorRecommendationResponse();
        response.setRecommendationId(recommendation.getRecommendationId());
        response.setIncidentId(recommendation.getIncident().getIncidentId());
        response.setDoctorId(recommendation.getDoctorId());
        response.setDoctorName(recommendation.getDoctorName());
        response.setRecommendation(recommendation.getRecommendation());
        response.setCreatedAt(recommendation.getCreatedAt());
        return response;
    }

    public String generateAiInsights(IncidentInsightsRequest request) {
        return incidentAiInsightsService.generateInsights(request);
    }

    @Transactional
    public IncidentResponse generateAndSaveAiInsights(String id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));

        IncidentInsightsRequest request = new IncidentInsightsRequest();
        request.setTitle(incident.getTitle());
        request.setType(incident.getType());
        request.setDescription(incident.getDescription());
        request.setSeverity(incident.getSeverity().name());
        request.setLocation(incident.getLocation());

        incident.setAiSuggestion(incidentAiInsightsService.generateInsights(request));
        return mapToResponse(incidentRepository.save(incident));
    }

    private String resolveAiSuggestion(IncidentRequest request) {
        if (StringUtils.hasText(request.getAiSuggestion())) {
            return request.getAiSuggestion();
        }

        try {
            return incidentAiInsightsService.generateInsights(toInsightsRequest(request));
        } catch (IllegalStateException ex) {
            return null;
        }
    }

    private IncidentInsightsRequest toInsightsRequest(IncidentRequest request) {
        IncidentInsightsRequest insightsRequest = new IncidentInsightsRequest();
        insightsRequest.setTitle(request.getTitle());
        insightsRequest.setType(request.getType());
        insightsRequest.setDescription(request.getDescription());
        insightsRequest.setSeverity(request.getSeverity());
        insightsRequest.setLocation(request.getLocation());
        return insightsRequest;
    }
}
