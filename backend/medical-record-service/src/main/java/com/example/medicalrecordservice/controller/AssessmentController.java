package com.example.medicalrecordservice.controller;

import com.example.medicalrecordservice.dto.AssessmentCreateRequest;
import com.example.medicalrecordservice.dto.AssessmentDoctorNoteRequest;
import com.example.medicalrecordservice.dto.AssessmentReportResponse;
import com.example.medicalrecordservice.entity.AlzheimerStage;
import com.example.medicalrecordservice.service.AssessmentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/assessments")
@Validated
public class AssessmentController {

    private final AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @PostMapping
    public ResponseEntity<AssessmentReportResponse> create(@Valid @RequestBody AssessmentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assessmentService.createAssessment(request));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AssessmentReportResponse>> listByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(assessmentService.listByPatient(patientId));
    }

    @GetMapping("/alerts")
    public ResponseEntity<Page<AssessmentReportResponse>> listAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(assessmentService.getAlerts(page, size));
    }

    @GetMapping
    public ResponseEntity<Page<AssessmentReportResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) AlzheimerStage stage,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String query
    ) {
        return ResponseEntity.ok(assessmentService.list(page, size, active, stage, fromDate, toDate, query));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssessmentReportResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(assessmentService.getById(id));
    }

    @PatchMapping("/{id}/doctor-note")
    public ResponseEntity<AssessmentReportResponse> patchDoctorNote(
            @PathVariable UUID id,
            @Valid @RequestBody AssessmentDoctorNoteRequest request
    ) {
        return ResponseEntity.ok(assessmentService.patchDoctorNote(id, request));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable UUID id) {
        byte[] payload = assessmentService.downloadPdfPlaceholder(id);
        String fileName = "assessment-" + id + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(payload);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> archive(@PathVariable UUID id) {
        assessmentService.archive(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<AssessmentReportResponse> restore(@PathVariable UUID id) {
        return ResponseEntity.ok(assessmentService.restore(id));
    }
}
