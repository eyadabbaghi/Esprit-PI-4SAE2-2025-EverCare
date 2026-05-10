package org.example.trackingservice.controllers;

import org.example.trackingservice.entities.Alert;
import org.example.trackingservice.services.AlertService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/alerts")

public class AlertController {

    private static final Logger log = LoggerFactory.getLogger(AlertController.class);

    private final AlertService service;

    public AlertController(AlertService service) {
        this.service = service;
    }

    @PostMapping
    public Alert create(@RequestBody Alert alert) {
        return service.create(alert);
    }

    @GetMapping("/patient/{patientId}")
    public List<Alert> getAlerts(@PathVariable String patientId) {
        try {
            return service.getPatientAlerts(patientId);
        } catch (RuntimeException ex) {
            log.warn("Could not load tracking alerts for patient {}", patientId, ex);
            return List.of();
        }
    }
}
