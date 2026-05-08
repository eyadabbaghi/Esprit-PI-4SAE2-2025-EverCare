package com.example.medicalrecordservice.dto;

import com.example.medicalrecordservice.entity.AlertStatus;
import com.example.medicalrecordservice.entity.AlzheimerStage;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ClinicalAlertResponse {
    private UUID id;
    private UUID assessmentReportId;
    private String patientId;
    private String patientName;
    private int scoreAtTrigger;
    private AlzheimerStage stageAtTrigger;
    private String reason;
    private AlertStatus status;
    private boolean active;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

