package tn.esprit.alerts.agent;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/evicare")
@RequiredArgsConstructor
public class EviCareController {

    private final IncidentPatternEngine patternEngine;

    @GetMapping("/analyse/{patientId}")
    public ResponseEntity<PatientRiskScore> analyse(@PathVariable String patientId) {
        return ResponseEntity.ok(patternEngine.analyse(patientId));
    }
}