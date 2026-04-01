package everCare.appointments.controllers;

import everCare.appointments.dtos.PrescriptionRequestDTO;
import everCare.appointments.dtos.PrescriptionResponseDTO;
import everCare.appointments.mappers.PrescriptionMapper;
import everCare.appointments.services.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final PrescriptionMapper mapper;

    // ========== CREATE ==========

    /**
     * Creates a prescription from a request body DTO.
     * Replaces both the old createPrescription and createPrescriptionFromConsultation endpoints.
     * The client sends IDs (patientId, doctorId, medicamentId, appointmentId) — not full objects.
     */
    @PostMapping
    public ResponseEntity<PrescriptionResponseDTO> createPrescription(@RequestBody PrescriptionRequestDTO request) {
        PrescriptionResponseDTO response = mapper.toResponse(
                prescriptionService.createPrescriptionFromConsultation(
                        request.getPatientId(),
                        request.getDoctorId(),
                        request.getAppointmentId(),
                        request.getMedicamentId(),
                        request.getDateDebut(),
                        request.getDateFin(),
                        request.getPosologie()
                )
        );
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // ========== READ ALL ==========

    @GetMapping
    public ResponseEntity<List<PrescriptionResponseDTO>> getAllPrescriptions() {
        return ResponseEntity.ok(
                prescriptionService.getAllPrescriptions()
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY ID ==========

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponseDTO> getPrescriptionById(@PathVariable String id) {
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.getPrescriptionById(id)));
    }

    // ========== READ BY PATIENT ==========

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByPatient(patientId)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ ACTIVE BY PATIENT ==========

    @GetMapping("/patient/{patientId}/active")
    public ResponseEntity<List<PrescriptionResponseDTO>> getActivePrescriptionsByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(
                prescriptionService.getActivePrescriptionsByPatient(patientId)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== TODAY'S PRESCRIPTIONS BY PATIENT ==========

    @GetMapping("/patient/{patientId}/today")
    public ResponseEntity<List<PrescriptionResponseDTO>> getTodayPrescriptions(@PathVariable String patientId) {
        return ResponseEntity.ok(
                prescriptionService.getTodayPrescriptions(patientId)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY DOCTOR ==========

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByDoctor(@PathVariable String doctorId) {
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByDoctor(doctorId)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY MEDICAMENT ==========

    @GetMapping("/medicament/{medicamentId}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByMedicament(@PathVariable String medicamentId) {
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByMedicament(medicamentId)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY STATUS ==========

    @GetMapping("/status/{statut}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByStatus(@PathVariable String statut) {
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByStatus(statut)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY DATE RANGE ==========

    @GetMapping("/date-range")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByDateRange(start, end)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ EXPIRING SOON ==========

    @GetMapping("/expiring")
    public ResponseEntity<List<PrescriptionResponseDTO>> getExpiringPrescriptions(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(
                prescriptionService.getExpiringPrescriptions(days)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== READ BY APPOINTMENT ==========

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<PrescriptionResponseDTO>> getPrescriptionsByAppointment(@PathVariable String appointmentId) {
        return ResponseEntity.ok(
                prescriptionService.getPrescriptionsByAppointment(appointmentId)
                        .stream().map(mapper::toResponse).collect(Collectors.toList())
        );
    }

    // ========== UPDATE (full update) ==========

    @PutMapping("/{id}")
    public ResponseEntity<PrescriptionResponseDTO> updatePrescription(
            @PathVariable String id,
            @RequestBody PrescriptionRequestDTO request) {
        // We reuse createPrescriptionFromConsultation logic but target an existing prescription.
        // The service updatePrescription handles partial updates.
        // For now, pass a minimal entity built from request fields only.
        return ResponseEntity.ok(
                mapper.toResponse(prescriptionService.updatePrescriptionFromRequest(id, request))
        );
    }

    // ========== LIFECYCLE PATCH ENDPOINTS ==========

    @PatchMapping("/{id}/terminate")
    public ResponseEntity<PrescriptionResponseDTO> terminatePrescription(@PathVariable String id) {
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.terminatePrescription(id)));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<PrescriptionResponseDTO> cancelPrescription(@PathVariable String id) {
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.cancelPrescription(id)));
    }

    @PatchMapping("/{id}/renew")
    public ResponseEntity<PrescriptionResponseDTO> renewPrescription(
            @PathVariable String id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newDateFin) {
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.renewPrescription(id, newDateFin)));
    }

    // ========== PARTIAL PATCH ENDPOINTS ==========

    @PatchMapping("/{id}/posologie")
    public ResponseEntity<PrescriptionResponseDTO> updatePosologie(
            @PathVariable String id, @RequestParam String posologie) {
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.updatePosologie(id, posologie)));
    }

    @PatchMapping("/{id}/resume")
    public ResponseEntity<PrescriptionResponseDTO> updateResumeSimple(
            @PathVariable String id, @RequestParam String resume) {
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.updateResumeSimple(id, resume)));
    }

    @PatchMapping("/{id}/notes")
    public ResponseEntity<PrescriptionResponseDTO> addNotes(
            @PathVariable String id, @RequestParam String notes) {
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.addNotes(id, notes)));
    }

    // ========== PDF GENERATION ==========

    @PostMapping("/{id}/generate-pdf")
    public ResponseEntity<PrescriptionResponseDTO> generatePdf(@PathVariable String id) {
        return ResponseEntity.ok(mapper.toResponse(prescriptionService.generatePdf(id)));
    }

    // ========== DELETE ==========

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePrescription(@PathVariable String id) {
        prescriptionService.deletePrescription(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/patient/{patientId}")
    public ResponseEntity<Void> deletePrescriptionsByPatient(@PathVariable String patientId) {
        prescriptionService.deletePrescriptionsByPatient(patientId);
        return ResponseEntity.noContent().build();
    }

    // ========== COUNT ==========

    @GetMapping("/count/medicament/{medicamentId}")
    public ResponseEntity<Long> countByMedicament(@PathVariable String medicamentId) {
        return ResponseEntity.ok(prescriptionService.countByMedicament(medicamentId));
    }
}