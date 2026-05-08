package org.example.trackingservice.services;

import org.example.trackingservice.entities.Alert;
import org.example.trackingservice.entities.LocationPing;
import org.example.trackingservice.repositories.AlertRepository;
import org.example.trackingservice.repositories.LocationPingRepository;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.List;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class AlertService {
    private final SimpMessagingTemplate messagingTemplate;
    private final AlertRepository alertRepo;
    private final LocationPingRepository locationRepo;

    public AlertService(AlertRepository alertRepo,
                        LocationPingRepository locationRepo,
                        SimpMessagingTemplate messagingTemplate) {
        this.alertRepo = alertRepo;
        this.locationRepo = locationRepo;
        this.messagingTemplate = messagingTemplate;
    }
    // ðŸ”¥ MAIN METHOD (NO SPAM)
    public void checkAndCreateAlert(LocationPing current) {

        List<LocationPing> history =
                locationRepo.findByPatientIdOrderByTimestampDesc(current.getPatientId());

        if (history.size() < 2) return;

        LocationPing previous = history.get(1);

        int oldRisk = previous.getRiskScore();
        int newRisk = current.getRiskScore();

        // 🔴 LEFT SAFE ZONE
        if (previous.getInsideSafeZone() && !current.getInsideSafeZone()) {
            createAlert(current, "Patient left safe zone", "HIGH");
            checkEscalation(current, history);
            return;
        }

        // 🔴 ENTER DANGER
        if (oldRisk < 70 && newRisk >= 70) {
            createAlert(current, "Patient entered danger zone", "HIGH");
        }

        // 🟡 WARNING
        else if (oldRisk < 40 && newRisk >= 40) {
            createAlert(current, "Patient risk increasing", "MEDIUM");
        }

        // 🔵 BACK SAFE
        else if (oldRisk >= 40 && newRisk < 40) {
            createAlert(current, "Patient is safe again", "LOW");
        }

        checkEscalation(current, history);
    }
    // ================= CREATE =================
    private void createAlert(LocationPing ping, String message, String severity) {

        if (isRateLimited(ping.getPatientId(), message)) {
            return;
        }

        Alert alert = new Alert();
        alert.setPatientId(ping.getPatientId());
        alert.setMessage(message);
        alert.setSeverity(severity);

        Alert saved = alertRepo.save(alert);

        // ðŸ”¥ REAL-TIME PUSH
        messagingTemplate.convertAndSend(
                "/topic/alerts/" + ping.getPatientId(),
                saved
        );
    }

    private boolean isRateLimited(String patientId, String message) {
        Alert last = alertRepo.findTopByPatientIdAndMessageOrderByTimestampDesc(patientId, message);
        if (last == null || last.getTimestamp() == null) return false;
        Duration sinceLast = Duration.between(last.getTimestamp(), LocalDateTime.now());
        return sinceLast.toMinutes() < 2;
    }

    // ================= ESCALATION =================
    private void checkEscalation(LocationPing current, List<LocationPing> history) {
        if (current.getRiskScore() == null || current.getRiskScore() < 70) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(10);
        List<LocationPing> window = history.stream()
                .filter(p -> p.getTimestamp() != null && !p.getTimestamp().isBefore(cutoff))
                .toList();

        if (window.isEmpty()) return;

        LocalDateTime earliest = window.get(window.size() - 1).getTimestamp();
        if (earliest == null || earliest.isAfter(cutoff)) return;

        for (LocationPing ping : window) {
            Integer risk = ping.getRiskScore();
            if (risk == null || risk < 70) return;
        }

        createAlert(current, "Patient critical risk sustained", "CRITICAL");
    }

    // ================= GET =================
    public List<Alert> getPatientAlerts(String patientId) {
        return alertRepo.findByPatientIdOrderByTimestampDesc(patientId);
    }

    // ================= CREATE =================
    public Alert create(Alert alert) {
        return alertRepo.save(alert);
    }
}
