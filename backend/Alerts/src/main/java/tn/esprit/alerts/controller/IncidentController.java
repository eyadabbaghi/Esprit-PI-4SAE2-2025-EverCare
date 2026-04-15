package tn.esprit.alerts.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.alerts.dto.IncidentRequest;
import tn.esprit.alerts.dto.IncidentResponse;
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
}