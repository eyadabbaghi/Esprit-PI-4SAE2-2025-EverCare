package tn.esprit.alerts.agent;

import lombok.Data;

@Data
public class PatientRiskScore {
    private String patientId;
    private double score;          // 0.0 – 1.0
    private String level;          // LOW / MEDIUM / HIGH
    private String advice;         // human-readable tip EviCare sends
    private int totalIncidents;
    private int recentIncidents;   // last 30 days
    private int criticalCount;

    // New pattern fields
    private String dominantTimeOfDay;      // MORNING / AFTERNOON / EVENING / NIGHT
    private String riskiestLocation;       // e.g. "Bathroom"
    private String dominantIncidentType;   // e.g. "Medical"
    private String mostRecurringType;      // most repeated incident type
    private int missedAlertsCount;         // alerts still SENT (never acknowledged)
    private String patternSummary;         // human-readable multi-line insight
}