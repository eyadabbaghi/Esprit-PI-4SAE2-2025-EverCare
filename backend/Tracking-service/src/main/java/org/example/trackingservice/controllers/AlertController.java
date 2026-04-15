package org.example.trackingservice.controllers;

import org.example.trackingservice.entities.Alert;
import org.example.trackingservice.services.AlertService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/alerts")

public class AlertController {

    private final AlertService service;

    public AlertController(AlertService service) {
        this.service = service;
    }

    @PostMapping
    public Alert createAlert(@RequestBody Alert alert) {
        return service.createManualAlert(alert);
    }

    @GetMapping("/patient/{patientId}")
    public List<Alert> getAlerts(@PathVariable String patientId) {
        return service.getPatientAlerts(patientId);
    }
}
