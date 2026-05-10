package tn.esprit.alerts.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.alerts.dto.IncidentInsightsRequest;
import tn.esprit.alerts.dto.IncidentInsightsResponse;
import tn.esprit.alerts.dto.IncidentRequest;
import tn.esprit.alerts.dto.IncidentResponse;
import tn.esprit.alerts.dto.DoctorRecommendationRequest;
import tn.esprit.alerts.service.IncidentService;

import java.util.List;

@RestController
@RequestMapping("/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    @PostMapping
    public ResponseEntity<IncidentResponse> createIncident(@Valid @RequestBody IncidentRequest request) {
        IncidentResponse response = incidentService.createIncident(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/ai-insights")
    public ResponseEntity<IncidentInsightsResponse> generateAiInsights(@Valid @RequestBody IncidentInsightsRequest request) {
        String insights = incidentService.generateAiInsights(request);
        return ResponseEntity.ok(new IncidentInsightsResponse(insights));
    }

    @PostMapping("/{id}/ai-insights")
    public ResponseEntity<IncidentResponse> generateAndSaveAiInsights(@PathVariable String id) {
        IncidentResponse response = incidentService.generateAndSaveAiInsights(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/doctor-recommendations")
    public ResponseEntity<IncidentResponse> addDoctorRecommendation(
            @PathVariable String id,
            @Valid @RequestBody DoctorRecommendationRequest request) {
        IncidentResponse response = incidentService.addDoctorRecommendation(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncidentResponse> getIncident(@PathVariable String id) {
        IncidentResponse response = incidentService.getIncident(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<IncidentResponse>> getAllIncidents() {
        List<IncidentResponse> responses = incidentService.getAllIncidents();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}")
    public ResponseEntity<IncidentResponse> updateIncident(@PathVariable String id, @Valid @RequestBody IncidentRequest request) {
        IncidentResponse response = incidentService.updateIncident(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIncident(@PathVariable String id) {
        incidentService.deleteIncident(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<IncidentResponse> resolveIncident(@PathVariable String id) {
        IncidentResponse response = incidentService.resolveIncident(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/acknowledge")
    public ResponseEntity<IncidentResponse> acknowledgeIncident(@PathVariable String id) {
        IncidentResponse response = incidentService.acknowledgeIncident(id);
        return ResponseEntity.ok(response);
    }
}
