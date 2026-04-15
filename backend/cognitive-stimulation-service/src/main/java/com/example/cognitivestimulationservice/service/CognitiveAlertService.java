package com.example.cognitivestimulationservice.service;

import com.example.cognitivestimulationservice.entity.CognitiveAlert;
import com.example.cognitivestimulationservice.entity.CognitiveAlertSeverity;
import com.example.cognitivestimulationservice.entity.CognitiveAlertStatus;
import com.example.cognitivestimulationservice.entity.GameSession;
import com.example.cognitivestimulationservice.repository.CognitiveAlertRepository;
import com.example.cognitivestimulationservice.repository.GameSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CognitiveAlertService {

    private final CognitiveAlertRepository cognitiveAlertRepository;
    private final GameSessionRepository gameSessionRepository;

    @Transactional
    public void evaluateSessionAlerts(GameSession session) {
        List<CognitiveAlert> alerts = checkForAlerts(session);
        for (CognitiveAlert alert : alerts) {
            Optional<CognitiveAlert> existing = cognitiveAlertRepository.findByMedicalRecordIdOrderByCreatedAtDesc(session.getMedicalRecordId())
                    .stream()
                    .filter(a -> a.getReason().equals(alert.getReason()) && a.getStatus() == CognitiveAlertStatus.ACTIVE)
                    .findFirst();
            if (existing.isEmpty()) {
                cognitiveAlertRepository.save(alert);
                log.info("Created cognitive alert: {} for session {}", alert.getReason(), session.getId());
            }
        }
    }

    private List<CognitiveAlert> checkForAlerts(GameSession session) {
        List<CognitiveAlert> alerts = new ArrayList<>();

        // Score drop
        List<GameSession> recent = gameSessionRepository.findTop5ByMedicalRecordIdOrderByPlayedAtDesc(session.getMedicalRecordId());
        if (recent.size() >= 2) {
            double avg = recent.subList(0, recent.size() - 1).stream().mapToInt(GameSession::getScore).average().orElse(0);
            if (session.getScore() < avg * 0.8) {
                alerts.add(CognitiveAlert.builder()
                        .medicalRecordId(session.getMedicalRecordId())
                        .patientId(session.getPatientId())
                        .reason("Score drop: " + session.getScore() + " vs avg " + String.format("%.1f", avg))
                        .severity(CognitiveAlertSeverity.MEDIUM)
                        .build());
            }
        }

        // High frustration
        if (session.getFrustrationLevel() >= 4) {
            alerts.add(CognitiveAlert.builder()
                    .medicalRecordId(session.getMedicalRecordId())
                    .patientId(session.getPatientId())
                    .reason("High frustration level: " + session.getFrustrationLevel())
                    .severity(CognitiveAlertSeverity.HIGH)
                    .build());
        }

        // Repeated abandoned
        long abandonedCount = recent.stream().filter(GameSession::isAbandoned).count();
        if (abandonedCount >= 3) {
            alerts.add(CognitiveAlert.builder()
                    .medicalRecordId(session.getMedicalRecordId())
                    .patientId(session.getPatientId())
                    .reason("Repeated abandonment (" + abandonedCount + "/5 sessions)")
                    .severity(CognitiveAlertSeverity.HIGH)
                    .build());
        }

        // Repeated assistance
        long assistanceCount = recent.stream().filter(GameSession::isAssistanceNeeded).count();
        if (assistanceCount >= 3) {
            alerts.add(CognitiveAlert.builder()
                    .medicalRecordId(session.getMedicalRecordId())
                    .patientId(session.getPatientId())
                    .reason("Repeated assistance needed (" + assistanceCount + "/5 sessions)")
                    .severity(CognitiveAlertSeverity.MEDIUM)
                    .build());
        }

        return alerts;
    }

    public List<CognitiveAlert> getAllAlerts() {
        return cognitiveAlertRepository.findByStatusAndActiveOrderByCreatedAtDesc(CognitiveAlertStatus.ACTIVE, true);
    }

    public List<CognitiveAlert> getAlertsByMedicalRecord(UUID medicalRecordId) {
        return cognitiveAlertRepository.findByMedicalRecordIdOrderByCreatedAtDesc(medicalRecordId);
    }

    @Transactional
    public CognitiveAlert acknowledgeAlert(UUID alertId) {
        CognitiveAlert alert = cognitiveAlertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        alert.setStatus(CognitiveAlertStatus.ACKNOWLEDGED);
        return cognitiveAlertRepository.save(alert);
    }

    @Transactional
    public CognitiveAlert resolveAlert(UUID alertId) {
        CognitiveAlert alert = cognitiveAlertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        alert.setStatus(CognitiveAlertStatus.RESOLVED);
        alert.setActive(false);
        return cognitiveAlertRepository.save(alert);
    }
}

