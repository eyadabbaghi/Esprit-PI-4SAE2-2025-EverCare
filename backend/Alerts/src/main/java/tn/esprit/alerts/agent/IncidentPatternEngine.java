package tn.esprit.alerts.agent;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tn.esprit.alerts.entity.Alert;
import tn.esprit.alerts.entity.AlertStatus;
import tn.esprit.alerts.entity.Incident;
import tn.esprit.alerts.entity.IncidentStatus;
import tn.esprit.alerts.entity.Severity;
import tn.esprit.alerts.repository.AlertRepository;
import tn.esprit.alerts.repository.IncidentRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class IncidentPatternEngine {

    private final IncidentRepository incidentRepository;
    private final AlertRepository alertRepository;

    public PatientRiskScore analyse(String patientId) {
        List<Incident> all = incidentRepository.findByPatientId(patientId);

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<Incident> recent = all.stream()
                .filter(i -> i.getIncidentDate().isAfter(thirtyDaysAgo))
                .collect(Collectors.toList());

        long critical = all.stream()
                .filter(i -> i.getSeverity() == Severity.CRITICAL
                        || i.getSeverity() == Severity.HIGH)
                .count();

        long open = all.stream()
                .filter(i -> i.getStatus() == IncidentStatus.OPEN)
                .count();

        // ── Base score (same as before) ──────────────────────────────
        double score = Math.min(1.0,
                (recent.size() * 0.15)
                        + (critical      * 0.25)
                        + (open          * 0.10)
        );

        // ── Pattern 1: time-of-day ────────────────────────────────────
        String dominantTime = analyseDominantTimeOfDay(all);
        if ("NIGHT".equals(dominantTime) || "EVENING".equals(dominantTime)) {
            score = Math.min(1.0, score + 0.10);
        }

        // ── Pattern 2: location ───────────────────────────────────────
        String riskiestLocation = analyseRiskiestLocation(all);
        // High-risk locations add to score
        if (riskiestLocation != null) {
            String loc = riskiestLocation.toLowerCase();
            if (loc.contains("bathroom") || loc.contains("stairs") || loc.contains("kitchen")) {
                score = Math.min(1.0, score + 0.10);
            }
        }

        // ── Pattern 3: dominant incident type ────────────────────────
        String dominantType = analyseDominantType(all);

        // ── Pattern 4: most recurring type ───────────────────────────
        String recurringType = analyseMostRecurringType(all);
        // If a type appears 3+ times it's a recurring pattern — bump score
        long recurringCount = all.stream()
                .filter(i -> recurringType != null
                        && recurringType.equalsIgnoreCase(i.getType()))
                .count();
        if (recurringCount >= 3) {
            score = Math.min(1.0, score + 0.10);
        }

        // ── Pattern 5: missed alerts ──────────────────────────────────
        List<Alert> patientAlerts = alertRepository.findByTargetId(patientId);
        long missedAlerts = patientAlerts.stream()
                .filter(a -> a.getStatus() == AlertStatus.SENT)
                .count();
        if (missedAlerts >= 2) {
            score = Math.min(1.0, score + 0.10);
        }

        // ── Build result ──────────────────────────────────────────────
        PatientRiskScore result = new PatientRiskScore();
        result.setPatientId(patientId);
        result.setScore(score);
        result.setTotalIncidents(all.size());
        result.setRecentIncidents(recent.size());
        result.setCriticalCount((int) critical);
        result.setDominantTimeOfDay(dominantTime);
        result.setRiskiestLocation(riskiestLocation);
        result.setDominantIncidentType(dominantType);
        result.setMostRecurringType(recurringType);
        result.setMissedAlertsCount((int) missedAlerts);

        // ── Level ─────────────────────────────────────────────────────
        if (score >= 0.6) {
            result.setLevel("HIGH");
        } else if (score >= 0.3) {
            result.setLevel("MEDIUM");
        } else {
            result.setLevel("LOW");
        }

        result.setAdvice(buildAdvice(result));
        result.setPatternSummary(buildPatternSummary(result));

        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private String analyseDominantTimeOfDay(List<Incident> incidents) {
        Map<String, Long> counts = incidents.stream()
                .collect(Collectors.groupingBy(i -> {
                    int hour = i.getIncidentDate().getHour();
                    if (hour >= 6  && hour < 12) return "MORNING";
                    if (hour >= 12 && hour < 18) return "AFTERNOON";
                    if (hour >= 18 && hour < 22) return "EVENING";
                    return "NIGHT";
                }, Collectors.counting()));

        return counts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("UNKNOWN");
    }

    private String analyseRiskiestLocation(List<Incident> incidents) {
        return incidents.stream()
                .filter(i -> i.getLocation() != null && !i.getLocation().isBlank())
                .collect(Collectors.groupingBy(
                        i -> i.getLocation().trim().toLowerCase(),
                        Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private String analyseDominantType(List<Incident> incidents) {
        return incidents.stream()
                .filter(i -> i.getType() != null)
                .collect(Collectors.groupingBy(Incident::getType, Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private String analyseMostRecurringType(List<Incident> incidents) {
        // Same as dominant type but only counts types appearing 2+ times
        return incidents.stream()
                .filter(i -> i.getType() != null)
                .collect(Collectors.groupingBy(Incident::getType, Collectors.counting()))
                .entrySet().stream()
                .filter(e -> e.getValue() >= 2)
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private String buildAdvice(PatientRiskScore score) {
        if ("HIGH".equals(score.getLevel())) {
            return "EviCare detected a high risk pattern. Multiple serious incidents, "
                    + "unacknowledged alerts, and recurring behaviour detected. "
                    + "Please contact your caregiver immediately.";
        } else if ("MEDIUM".equals(score.getLevel())) {
            return "EviCare noticed some recurring patterns in your incident history. "
                    + "Stay attentive and keep your scheduled checks.";
        }
        return "Things look stable. Keep following your routine and stay hydrated.";
    }

    private String buildPatternSummary(PatientRiskScore score) {
        List<String> lines = new ArrayList<>();

        if (score.getDominantTimeOfDay() != null) {
            lines.add("Most incidents occur in the " + score.getDominantTimeOfDay().toLowerCase() + ".");
        }
        if (score.getRiskiestLocation() != null) {
            lines.add("Highest incident location: " + score.getRiskiestLocation() + ".");
        }
        if (score.getDominantIncidentType() != null) {
            lines.add("Most common incident type: " + score.getDominantIncidentType() + ".");
        }
        if (score.getMostRecurringType() != null) {
            lines.add("Recurring pattern detected: " + score.getMostRecurringType() + " incidents.");
        }
        if (score.getMissedAlertsCount() > 0) {
            lines.add(score.getMissedAlertsCount() + " alert(s) were never acknowledged.");
        }

        return String.join(" ", lines);
    }
}