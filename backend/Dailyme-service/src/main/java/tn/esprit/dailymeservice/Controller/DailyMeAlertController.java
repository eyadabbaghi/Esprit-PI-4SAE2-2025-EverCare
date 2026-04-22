package tn.esprit.dailymeservice.Controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.dailymeservice.Model.DailyMeAlert;
import tn.esprit.dailymeservice.Service.DailyMeAlertService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dailyme-alerts")
@RequiredArgsConstructor

public class DailyMeAlertController {

    private final DailyMeAlertService service;

    // doctor: see NEW alerts
    @GetMapping("/new")
    public ResponseEntity<List<DailyMeAlert>> getNew() {
        return ResponseEntity.ok(service.getNew());
    }

    // doctor: see alerts of a patient
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<DailyMeAlert>> getByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(service.getByPatient(patientId));
    }

    // doctor: update status
    @PatchMapping("/{id}/status")
    public ResponseEntity<DailyMeAlert> updateStatus(@PathVariable Long id,
                                                     @RequestBody Map<String, String> body) {
        String status = String.valueOf(body.getOrDefault("status", "SEEN")).toUpperCase();
        return ResponseEntity.ok(service.markStatus(id, status));
    }
}