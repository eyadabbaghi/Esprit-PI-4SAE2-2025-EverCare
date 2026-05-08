package tn.esprit.dailymeservice.Dto;

import lombok.Data;
import java.util.List;

@Data
public class PatientDashboardInsightsDTO {
    private String patientId;

    // top cards
    private long activeTasks;
    private long completedActive;
    private double completionRate; // 0..100
    private long missedHistory;

    // charts data ready for Angular
    private List<TypeCountDTO> taskTypeDistribution;
    private List<DayRateDTO> weeklyCompletionTrend;

    // “advanced” outputs
    private String riskLevel;              // LOW / MEDIUM / HIGH
    private List<String> riskReasons;      // explainable reasons
    private List<String> suggestedNotes;   // the notes you already show
    private List<String> detectedKeywords; // from titles/notes
}