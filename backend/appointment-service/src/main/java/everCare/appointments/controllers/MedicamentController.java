package everCare.appointments.controllers;

import everCare.appointments.dtos.MedicamentAnalyticsSummaryDTO;
import everCare.appointments.dtos.MedicamentUsageStatsDTO;
import everCare.appointments.dtos.MedicationDosingRulesDTO;
import everCare.appointments.entities.Medicament;
import everCare.appointments.services.MedicamentService;
import everCare.appointments.services.PrescriptionAccessControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/medicaments")
@RequiredArgsConstructor
public class MedicamentController {

    private final MedicamentService medicamentService;
    private final PrescriptionAccessControlService accessControlService;

    // ========== CREATE ==========

    @PostMapping
    public ResponseEntity<Medicament> createMedicament(@RequestBody Medicament medicament) {
        accessControlService.assertAdminAccess();
        Medicament createdMedicament = medicamentService.createMedicament(medicament);
        return new ResponseEntity<>(createdMedicament, HttpStatus.CREATED);
    }

    // ========== READ ALL ==========

    @GetMapping
    public ResponseEntity<List<Medicament>> getAllMedicaments() {
        return ResponseEntity.ok(medicamentService.getAllMedicaments());
    }

    // ========== READ BY ID ==========

    @GetMapping("/{id}")
    public ResponseEntity<Medicament> getMedicamentById(@PathVariable String id) {
        return medicamentService.getMedicamentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ========== READ BY CODE CIP ==========

    @GetMapping("/code/{codeCIP}")
    public ResponseEntity<Medicament> getMedicamentByCodeCIP(@PathVariable String codeCIP) {
        return medicamentService.getMedicamentByCodeCIP(codeCIP)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ========== SEARCH ==========

    @GetMapping("/search")
    public ResponseEntity<List<Medicament>> searchMedicaments(@RequestParam String keyword) {
        return ResponseEntity.ok(medicamentService.searchMedicaments(keyword));
    }

    @GetMapping("/filter")
    public ResponseEntity<Page<Medicament>> filterMedicaments(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean actif,
            @RequestParam(required = false) String laboratoire,
            @RequestParam(required = false) String forme,
            @RequestParam(required = false) String dosage,
            @RequestParam(required = false) Boolean used,
            Pageable pageable) {
        return ResponseEntity.ok(
                medicamentService.filterMedicaments(keyword, actif, laboratoire, forme, dosage, used, pageable)
        );
    }

    // ========== READ ACTIVE ==========

    @GetMapping("/active")
    public ResponseEntity<List<Medicament>> getActiveMedicaments() {
        return ResponseEntity.ok(medicamentService.getActiveMedicaments());
    }

    // ========== READ BY LABORATOIRE ==========

    @GetMapping("/laboratoire/{laboratoire}")
    public ResponseEntity<List<Medicament>> getMedicamentsByLaboratoire(@PathVariable String laboratoire) {
        return ResponseEntity.ok(medicamentService.getMedicamentsByLaboratoire(laboratoire));
    }

    // ========== READ BY FORME ==========

    @GetMapping("/forme/{forme}")
    public ResponseEntity<List<Medicament>> getMedicamentsByForme(@PathVariable String forme) {
        return ResponseEntity.ok(medicamentService.getMedicamentsByForme(forme));
    }

    // ========== UPDATE ==========

    @PutMapping("/{id}")
    public ResponseEntity<Medicament> updateMedicament(@PathVariable String id, @RequestBody Medicament medicament) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(medicamentService.updateMedicament(id, medicament));
    }

    // ========== ACTIVATE ==========

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Medicament> activateMedicament(@PathVariable String id) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(medicamentService.activateMedicament(id));
    }

    // ========== DEACTIVATE ==========

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Medicament> deactivateMedicament(@PathVariable String id) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(medicamentService.deactivateMedicament(id));
    }

    // ========== UPDATE PHOTO ==========

    @PatchMapping("/{id}/photo")
    public ResponseEntity<Medicament> updatePhoto(@PathVariable String id, @RequestParam String photoUrl) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(medicamentService.updatePhoto(id, photoUrl));
    }

    // ========== UPDATE NOTICE ==========

    @PatchMapping("/{id}/notice")
    public ResponseEntity<Medicament> updateNotice(@PathVariable String id, @RequestParam String notice) {
        accessControlService.assertAdminAccess();
        return ResponseEntity.ok(medicamentService.updateNotice(id, notice));
    }

    // ========== DELETE ==========

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedicament(@PathVariable String id) {
        accessControlService.assertAdminAccess();
        medicamentService.deleteMedicament(id);
        return ResponseEntity.noContent().build();
    }

    // ========== DELETE ALL ==========

    @DeleteMapping("/all")
    public ResponseEntity<Void> deleteAllMedicaments() {
        accessControlService.assertAdminAccess();
        medicamentService.deleteAllMedicaments();
        return ResponseEntity.noContent().build();
    }

    // ========== COUNT ==========

    @GetMapping("/count")
    public ResponseEntity<Long> countMedicaments() {
        return ResponseEntity.ok(medicamentService.countMedicaments());
    }

    @GetMapping("/analytics/summary")
    public ResponseEntity<MedicamentAnalyticsSummaryDTO> getAnalyticsSummary() {
        String doctorScope = null;

        if (accessControlService.getRequesterRole() == everCare.appointments.entities.UserRole.DOCTOR) {
            doctorScope = accessControlService.getRequesterUserId();
        } else {
            accessControlService.assertAdminAccess();
        }

        return ResponseEntity.ok(medicamentService.getAnalyticsSummary(doctorScope));
    }

    @GetMapping("/analytics/usage")
    public ResponseEntity<List<MedicamentUsageStatsDTO>> getUsageStats(
            @RequestParam(defaultValue = "10") int limit) {
        String doctorScope = null;

        if (accessControlService.getRequesterRole() == everCare.appointments.entities.UserRole.DOCTOR) {
            doctorScope = accessControlService.getRequesterUserId();
        } else {
            accessControlService.assertAdminAccess();
        }

        return ResponseEntity.ok(medicamentService.getUsageStats(doctorScope, limit));
    }

    // ========== DOSING RULES ==========

    @GetMapping("/{id}/dosing-rules")
    public ResponseEntity<MedicationDosingRulesDTO> getDosingRules(@PathVariable String id) {
        var medicamentOpt = medicamentService.getMedicamentById(id);
        if (medicamentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var m = medicamentOpt.get();
        return ResponseEntity.ok(MedicationDosingRulesDTO.builder()
                .medicamentId(m.getMedicamentId())
                .maxDosePerDay(m.getMaxDosePerDay())
                .weightMaxDose(m.getWeightMaxDose())
                .renalAdjustment(m.getRenalAdjustment())
                .hepaticAdjustment(m.getHepaticAdjustment())
                .contraindications(m.getContreIndications())
                .commonInteractions(m.getCommonInteractions())
                .doseCalculation(m.getDoseCalculation())
                .build());
    }

    @PutMapping("/{id}/dosing-rules")
    public ResponseEntity<Medicament> updateDosingRules(
            @PathVariable String id,
            @RequestBody MedicationDosingRulesDTO rules) {
        accessControlService.assertAdminAccess();
        var medicamentOpt = medicamentService.getMedicamentById(id);
        if (medicamentOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var medicament = medicamentOpt.get();
        medicament.setMaxDosePerDay(rules.getMaxDosePerDay());
        medicament.setWeightMaxDose(rules.getWeightMaxDose());
        medicament.setRenalAdjustment(rules.getRenalAdjustment());
        medicament.setHepaticAdjustment(rules.getHepaticAdjustment());
        medicament.setContreIndications(rules.getContraindications());
        medicament.setCommonInteractions(rules.getCommonInteractions());
        medicament.setDoseCalculation(rules.getDoseCalculation());
        return ResponseEntity.ok(medicamentService.updateMedicament(id, medicament));
    }
}
