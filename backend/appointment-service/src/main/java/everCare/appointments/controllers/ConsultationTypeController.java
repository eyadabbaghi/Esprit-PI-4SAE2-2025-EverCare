package everCare.appointments.controllers;

import everCare.appointments.entities.ConsultationType;
import everCare.appointments.services.ConsultationTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/consultation-types")
@RequiredArgsConstructor

public class ConsultationTypeController {

    private final ConsultationTypeService consultationTypeService;

    // ========== CREATE ==========

    @PostMapping
    public ResponseEntity<ConsultationType> createConsultationType(@RequestBody ConsultationType consultationType) {
        ConsultationType createdType = consultationTypeService.createConsultationType(consultationType);
        return new ResponseEntity<>(createdType, HttpStatus.CREATED);
    }

    @PostMapping("/simple")
    public ResponseEntity<ConsultationType> createSimpleConsultationType(
            @RequestParam String name,
            @RequestParam String description,
            @RequestParam int defaultDurationMinutes,
            @RequestParam boolean requiresCaregiver,
            @RequestParam String environmentPreset) {

        ConsultationType createdType = consultationTypeService.createConsultationType(
                name, description, defaultDurationMinutes, requiresCaregiver, environmentPreset);

        return new ResponseEntity<>(createdType, HttpStatus.CREATED);
    }

    // ========== READ ALL ==========

    @GetMapping
    public ResponseEntity<List<ConsultationType>> getAllConsultationTypes() {
        List<ConsultationType> types = consultationTypeService.getAllConsultationTypes();
        return ResponseEntity.ok(types);
    }

    // ========== READ BY ID ==========

    @GetMapping("/{id}")
    public ResponseEntity<ConsultationType> getConsultationTypeById(@PathVariable String id) {
        ConsultationType type = consultationTypeService.getConsultationTypeById(id);
        return ResponseEntity.ok(type);
    }

    // ========== READ BY NAME ==========

    @GetMapping("/name/{name}")
    public ResponseEntity<ConsultationType> getConsultationTypeByName(@PathVariable String name) {
        ConsultationType type = consultationTypeService.getConsultationTypeByName(name);
        return ResponseEntity.ok(type);
    }

    // ========== READ ACTIVE ==========

    @GetMapping("/active")
    public ResponseEntity<List<ConsultationType>> getActiveConsultationTypes() {
        List<ConsultationType> types = consultationTypeService.getActiveConsultationTypes();
        return ResponseEntity.ok(types);
    }

    // ========== READ REQUIRING CAREGIVER ==========

    @GetMapping("/requires-caregiver")
    public ResponseEntity<List<ConsultationType>> getTypesRequiringCaregiver() {
        List<ConsultationType> types = consultationTypeService.getTypesRequiringCaregiver();
        return ResponseEntity.ok(types);
    }

    // ========== SEARCH ==========

    @GetMapping("/search")
    public ResponseEntity<List<ConsultationType>> searchTypes(@RequestParam String keyword) {
        List<ConsultationType> types = consultationTypeService.searchTypes(keyword);
        return ResponseEntity.ok(types);
    }

    // ========== READ BY MAX DURATION ==========

    @GetMapping("/max-duration/{minutes}")
    public ResponseEntity<List<ConsultationType>> getTypesByMaxDuration(@PathVariable int minutes) {
        List<ConsultationType> types = consultationTypeService.getTypesByMaxDuration(minutes);
        return ResponseEntity.ok(types);
    }

    // ========== UPDATE ==========

    @PutMapping("/{id}")
    public ResponseEntity<ConsultationType> updateConsultationType(
            @PathVariable String id,
            @RequestBody ConsultationType consultationType) {
        ConsultationType updatedType = consultationTypeService.updateConsultationType(id, consultationType);
        return ResponseEntity.ok(updatedType);
    }

    // ========== ACTIVATE ==========

    @PatchMapping("/{id}/activate")
    public ResponseEntity<ConsultationType> activateType(@PathVariable String id) {
        ConsultationType activatedType = consultationTypeService.activateType(id);
        return ResponseEntity.ok(activatedType);
    }

    // ========== DEACTIVATE ==========

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ConsultationType> deactivateType(@PathVariable String id) {
        ConsultationType deactivatedType = consultationTypeService.deactivateType(id);
        return ResponseEntity.ok(deactivatedType);
    }

    // ========== UPDATE DURATION ==========

    @PatchMapping("/{id}/duration")
    public ResponseEntity<ConsultationType> updateDuration(
            @PathVariable String id,
            @RequestParam int defaultDurationMinutes) {
        ConsultationType updatedType = consultationTypeService.updateDuration(id, defaultDurationMinutes);
        return ResponseEntity.ok(updatedType);
    }

    // ========== UPDATE ENVIRONMENT PRESET ==========

    @PatchMapping("/{id}/environment")
    public ResponseEntity<ConsultationType> updateEnvironmentPreset(
            @PathVariable String id,
            @RequestParam String environmentPreset) {
        ConsultationType updatedType = consultationTypeService.updateEnvironmentPreset(id, environmentPreset);
        return ResponseEntity.ok(updatedType);
    }

    // ========== DELETE ==========

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConsultationType(@PathVariable String id) {
        consultationTypeService.deleteConsultationType(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all")
    public ResponseEntity<Void> deleteAllConsultationTypes() {
        consultationTypeService.deleteAllConsultationTypes();
        return ResponseEntity.noContent().build();
    }

    // ========== BUSINESS LOGIC ==========

    @GetMapping("/calculate-alzheimer-duration")
    public ResponseEntity<Integer> calculateAlzheimerDuration(@RequestParam int defaultDuration) {
        int alzheimerDuration = consultationTypeService.calculateAlzheimerDuration(defaultDuration);
        return ResponseEntity.ok(alzheimerDuration);
    }

    @GetMapping("/{id}/available-for-patient")
    public ResponseEntity<Boolean> isTypeAvailableForPatient(
            @PathVariable String id,
            @RequestParam String patientStage) {
        boolean isAvailable = consultationTypeService.isTypeAvailableForPatient(id, patientStage);
        return ResponseEntity.ok(isAvailable);
    }

    @GetMapping("/recommended-for-patient")
    public ResponseEntity<List<ConsultationType>> getRecommendedTypesForPatient(@RequestParam String patientStage) {
        List<ConsultationType> types = consultationTypeService.getRecommendedTypesForPatient(patientStage);
        return ResponseEntity.ok(types);
    }

    @GetMapping("/{id}/consultations-count")
    public ResponseEntity<Long> countConsultationsByType(@PathVariable String id) {
        long count = consultationTypeService.countConsultationsByType(id);
        return ResponseEntity.ok(count);
    }
}