package com.example.medicalrecordservice.service;

import com.example.medicalrecordservice.dto.ClinicalAlertResponse;
import com.example.medicalrecordservice.entity.AlertStatus;
import com.example.medicalrecordservice.entity.AssessmentReport;
import com.example.medicalrecordservice.entity.ClinicalAlert;
import com.example.medicalrecordservice.repository.AssessmentReportRepository;
import com.example.medicalrecordservice.repository.ClinicalAlertRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class ClinicalAlertService {

    private final ClinicalAlertRepository clinicalAlertRepository;
    private final AssessmentReportRepository assessmentReportRepository;

    public ClinicalAlertService(
            ClinicalAlertRepository clinicalAlertRepository,
            AssessmentReportRepository assessmentReportRepository
    ) {
        this.clinicalAlertRepository = clinicalAlertRepository;
        this.assessmentReportRepository = assessmentReportRepository;
    }

    @Transactional
    public ClinicalAlertResponse createOpenAlert(AssessmentReport report, String reason) {
        if (report == null || reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Alert reason is required");
        }

        ClinicalAlert alert = ClinicalAlert.builder()
                .assessmentReport(report)
                .patientId(report.getPatientId())
                .patientName(report.getPatientName())
                .scoreAtTrigger(report.getScore())
                .stageAtTrigger(report.getComputedStage())
                .reason(reason.trim())
                .status(AlertStatus.OPEN)
                .active(true)
                .build();

        return toResponse(clinicalAlertRepository.save(alert));
    }

    @Transactional(readOnly = true)
    public Page<ClinicalAlertResponse> list(int page, int size, AlertStatus status) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (status == null) {
            return clinicalAlertRepository.findByActiveTrue(pageable).map(this::toResponse);
        }
        return clinicalAlertRepository.findByActiveTrueAndStatus(status, pageable).map(this::toResponse);
    }

    @Transactional
    public ClinicalAlertResponse acknowledge(UUID id) {
        ClinicalAlert alert = findActiveById(id);
        if (alert.getStatus() == AlertStatus.RESOLVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Resolved alert cannot be acknowledged");
        }
        if (alert.getStatus() == AlertStatus.ACK) {
            return toResponse(alert);
        }

        alert.setStatus(AlertStatus.ACK);
        alert.setAcknowledgedAt(LocalDateTime.now());
        return toResponse(clinicalAlertRepository.save(alert));
    }

    @Transactional
    public ClinicalAlertResponse resolve(UUID id) {
        ClinicalAlert alert = findActiveById(id);
        if (alert.getStatus() == AlertStatus.RESOLVED) {
            return toResponse(alert);
        }

        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now());
        ClinicalAlert saved = clinicalAlertRepository.save(alert);

        UUID reportId = alert.getAssessmentReport() == null ? null : alert.getAssessmentReport().getId();
        if (reportId != null) {
            assessmentReportRepository.findById(reportId).ifPresent(report -> {
                if (report.isNeedsAttention()) {
                    report.setNeedsAttention(false);
                    assessmentReportRepository.save(report);
                }
            });
        }

        return toResponse(saved);
    }

    @Transactional
    public ClinicalAlertResponse getOrCreateFromReport(UUID assessmentReportId) {
        AssessmentReport report = assessmentReportRepository.findById(assessmentReportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AssessmentReport not found"));

        ClinicalAlert existing = clinicalAlertRepository
                .findTopByAssessmentReport_IdAndActiveTrueOrderByCreatedAtDesc(assessmentReportId)
                .orElse(null);

        if (existing != null && existing.getStatus() != AlertStatus.RESOLVED) {
            return toResponse(existing);
        }

        if (!report.isNeedsAttention()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No active alert required for this report");
        }

        String reason = "Alerte générée depuis un rapport marqué needsAttention=true.";
        return createOpenAlert(report, reason);
    }

    private ClinicalAlert findActiveById(UUID id) {
        ClinicalAlert alert = clinicalAlertRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Clinical alert not found"));
        if (!alert.isActive()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Clinical alert not found");
        }
        return alert;
    }

    private ClinicalAlertResponse toResponse(ClinicalAlert alert) {
        return ClinicalAlertResponse.builder()
                .id(alert.getId())
                .assessmentReportId(alert.getAssessmentReport() == null ? null : alert.getAssessmentReport().getId())
                .patientId(alert.getPatientId())
                .patientName(alert.getPatientName())
                .scoreAtTrigger(alert.getScoreAtTrigger())
                .stageAtTrigger(alert.getStageAtTrigger())
                .reason(alert.getReason())
                .status(alert.getStatus())
                .active(alert.isActive())
                .acknowledgedAt(alert.getAcknowledgedAt())
                .resolvedAt(alert.getResolvedAt())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .build();
    }
}
