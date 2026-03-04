package com.example.medicalrecordservice.controller;

import com.example.medicalrecordservice.dto.ClinicalAlertResponse;
import com.example.medicalrecordservice.entity.AlertStatus;
import com.example.medicalrecordservice.service.ClinicalAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Validated
public class ClinicalAlertController {

    private final ClinicalAlertService clinicalAlertService;

    @GetMapping
    public ResponseEntity<Page<ClinicalAlertResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) AlertStatus status
    ) {
        return ResponseEntity.ok(clinicalAlertService.list(page, size, status));
    }

    @PatchMapping("/{id}/ack")
    public ResponseEntity<ClinicalAlertResponse> acknowledge(@PathVariable UUID id) {
        return ResponseEntity.ok(clinicalAlertService.acknowledge(id));
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<ClinicalAlertResponse> resolve(@PathVariable UUID id) {
        return ResponseEntity.ok(clinicalAlertService.resolve(id));
    }

    @PostMapping("/from-report/{assessmentReportId}")
    public ResponseEntity<ClinicalAlertResponse> getOrCreateFromReport(@PathVariable UUID assessmentReportId) {
        return ResponseEntity.ok(clinicalAlertService.getOrCreateFromReport(assessmentReportId));
    }
}
