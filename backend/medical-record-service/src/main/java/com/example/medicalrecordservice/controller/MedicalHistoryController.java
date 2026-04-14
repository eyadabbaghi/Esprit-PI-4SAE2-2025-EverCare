package com.example.medicalrecordservice.controller;

import com.example.medicalrecordservice.dto.MedicalHistoryCreateRequest;
import com.example.medicalrecordservice.entity.MedicalHistory;
import com.example.medicalrecordservice.service.MedicalHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medical-records/{recordId}/history")
@RequiredArgsConstructor

public class MedicalHistoryController {

    private final MedicalHistoryService historyService;

    @PostMapping
    public ResponseEntity<MedicalHistory> add(@PathVariable UUID recordId, @Valid @RequestBody MedicalHistoryCreateRequest request) {
        MedicalHistory created = historyService.addToRecord(recordId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<MedicalHistory>> list(@PathVariable UUID recordId) {
        return ResponseEntity.ok(historyService.listByRecord(recordId));
    }

    @DeleteMapping("/{historyId}")
    public ResponseEntity<Void> delete(@PathVariable UUID recordId, @PathVariable UUID historyId) {
        historyService.delete(recordId, historyId);
        return ResponseEntity.noContent().build();
    }
}
