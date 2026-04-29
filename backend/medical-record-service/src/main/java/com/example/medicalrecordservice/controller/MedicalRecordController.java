package com.example.medicalrecordservice.controller;

import com.example.medicalrecordservice.dto.AutoCreateMedicalRecordRequest;
import com.example.medicalrecordservice.dto.MedicalRecordCreateRequest;
import com.example.medicalrecordservice.dto.MedicalRecordUpdateRequest;
import com.example.medicalrecordservice.entity.MedicalRecord;
import com.example.medicalrecordservice.service.MedicalRecordService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/medical-records")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    public MedicalRecordController(MedicalRecordService medicalRecordService) {
        this.medicalRecordService = medicalRecordService;
    }

    @PostMapping
    public ResponseEntity<MedicalRecord> create(@Valid @RequestBody MedicalRecordCreateRequest request) {
        MedicalRecord created = medicalRecordService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/auto-create")
    public ResponseEntity<MedicalRecord> autoCreate(@Valid @RequestBody AutoCreateMedicalRecordRequest request) {
        MedicalRecordService.AutoCreateResult result = medicalRecordService.autoCreate(request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.record());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecord> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(medicalRecordService.findById(id));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<MedicalRecord> findByPatientId(@PathVariable String patientId) {
        return ResponseEntity.ok(medicalRecordService.findByPatientId(patientId));
    }

    @GetMapping
    public ResponseEntity<Page<MedicalRecord>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(medicalRecordService.findAll(page, size, active));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicalRecord> update(@PathVariable UUID id, @Valid @RequestBody MedicalRecordUpdateRequest request) {
        return ResponseEntity.ok(medicalRecordService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        medicalRecordService.archive(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<MedicalRecord> restore(@PathVariable UUID id) {
        return ResponseEntity.ok(medicalRecordService.restore(id));
    }

}
