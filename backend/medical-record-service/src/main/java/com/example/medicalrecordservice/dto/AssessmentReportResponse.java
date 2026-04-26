package com.example.medicalrecordservice.dto;

import com.example.medicalrecordservice.entity.AlzheimerStage;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class AssessmentReportResponse {
    private UUID id;
    private String patientId;
    private String patientName;
    private String caregiverName;
    private Map<String, Integer> answers;
    private int score;
    private AlzheimerStage computedStage;
    private String recommendation;
    private String doctorNote;
    private boolean needsAttention;
    private boolean active;
    private LocalDateTime createdAt;
}
