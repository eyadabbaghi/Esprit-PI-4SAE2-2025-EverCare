package everCare.appointments.controllers;

import everCare.appointments.dtos.ClinicalMeasurementRequestDTO;
import everCare.appointments.dtos.ClinicalMeasurementResponseDTO;
import everCare.appointments.services.ClinicalMeasurementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clinical-measurements")
@RequiredArgsConstructor
public class ClinicalMeasurementController {

    private final ClinicalMeasurementService service;

    @PostMapping
    public ResponseEntity<ClinicalMeasurementResponseDTO> save(
            @RequestBody ClinicalMeasurementRequestDTO request,
            @RequestHeader(value = "X-User-Id", required = false) String caregiverId) {
        ClinicalMeasurementResponseDTO saved = service.save(request, caregiverId);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<ClinicalMeasurementResponseDTO> getByAppointment(
            @PathVariable String appointmentId) {
        ClinicalMeasurementResponseDTO measurement = service.getByAppointmentId(appointmentId);
        if (measurement == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(measurement);
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<ClinicalMeasurementResponseDTO>> getByPatient(
            @PathVariable String patientId) {
        return ResponseEntity.ok(service.getByPatientId(patientId));
    }

    @GetMapping("/patient/{patientId}/latest")
    public ResponseEntity<ClinicalMeasurementResponseDTO> getLatestForPatient(
            @PathVariable String patientId) {
        ClinicalMeasurementResponseDTO measurement = service.getLatestForPatient(patientId);
        if (measurement == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(measurement);
    }
}