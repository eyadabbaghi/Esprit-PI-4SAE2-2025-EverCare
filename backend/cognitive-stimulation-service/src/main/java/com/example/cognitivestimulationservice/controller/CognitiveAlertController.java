package com.example.cognitivestimulationservice.controller;

import com.example.cognitivestimulationservice.entity.CognitiveAlert;
import com.example.cognitivestimulationservice.service.CognitiveAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cognitive-alerts")
@RequiredArgsConstructor
public class CognitiveAlertController {

    private final CognitiveAlertService cognitiveAlertService;

    @GetMapping
    public ResponseEntity<List<CognitiveAlert>> getAllAlerts() {
        return ResponseEntity.ok(cognitiveAlertService.getAllAlerts());
    }

    @GetMapping("/medical-record/{id}")
    public ResponseEntity<List<CognitiveAlert>> getAlertsByMedicalRecord(@PathVariable UUID id) {
        return ResponseEntity.ok(cognitiveAlertService.getAlertsByMedicalRecord(id));
    }

    @PatchMapping("/{id}/acknowledge")
    public ResponseEntity<CognitiveAlert> acknowledge(@PathVariable UUID id) {
        return ResponseEntity.ok(cognitiveAlertService.acknowledgeAlert(id));
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<CognitiveAlert> resolve(@PathVariable UUID id) {
        return ResponseEntity.ok(cognitiveAlertService.resolveAlert(id));
    }
}

