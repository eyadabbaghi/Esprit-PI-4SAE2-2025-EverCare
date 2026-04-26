package tn.esprit.alerts.agent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tn.esprit.alerts.entity.Incident;
import tn.esprit.alerts.repository.IncidentRepository;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class EviCareAgent {

    private final IncidentRepository incidentRepository;
    private final IncidentPatternEngine patternEngine;
    private final EviCareNotificationService notificationService;

    // Runs every 6 hours
    //@Scheduled(fixedRateString = "PT6H")
    //@Scheduled(fixedDelay = 120000) // 120,000 ms = 2 minutes
    public void run() {
        log.info("EviCare agent waking up...");

        Set<String> patientIds = incidentRepository.findAll()
                .stream()
                .map(Incident::getPatientId)
                .collect(Collectors.toSet());

        for (String patientId : patientIds) {
            PatientRiskScore score = patternEngine.analyse(patientId);
            log.info("EviCare: patient {} → {} (score {})",
                    patientId, score.getLevel(), String.format("%.2f", score.getScore()));
            notificationService.notify(score);
        }

        log.info("EviCare agent finished. {} patients analysed.", patientIds.size());
    }
}