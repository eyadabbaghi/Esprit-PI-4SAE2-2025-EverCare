package tn.esprit.dailymeservice.Service;

import org.springframework.stereotype.Service;
import tn.esprit.dailymeservice.Dto.*;
import tn.esprit.dailymeservice.Repository.DailyTaskRepository;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class PatientInsightsService {

    private final DailyTaskRepository taskRepo;
    private final DailyMeAlertService alertService;

    public PatientInsightsService(DailyTaskRepository taskRepo, DailyMeAlertService alertService) {
        this.taskRepo = taskRepo;
        this.alertService = alertService;
    }

    public PatientDashboardInsightsDTO buildPatientDashboard(String patientId) {
        PatientDashboardInsightsDTO dto = new PatientDashboardInsightsDTO();
        dto.setPatientId(patientId);

        // 1) Top cards (JPQL)
        long active = taskRepo.countActive(patientId);
        long doneActive = taskRepo.countCompletedActive(patientId);
        dto.setActiveTasks(active);
        dto.setCompletedActive(doneActive);

        double rate = (active == 0) ? 0.0 : (doneActive * 100.0 / active);
        dto.setCompletionRate(round1(rate));

        long missed = taskRepo.countMissedHistory(patientId, LocalDateTime.now().minusHours(24));
        dto.setMissedHistory(missed);

        // 2) Donut chart (JPQL result -> DTO list)
        List<TypeCountDTO> dist = new ArrayList<TypeCountDTO>();
        List<Object[]> byType = taskRepo.countByTypeActive(patientId);
        for (Object[] row : byType) {
            String type = (String) row[0];
            long count = ((Number) row[1]).longValue();
            dist.add(new TypeCountDTO(type, count));
        }
        dto.setTaskTypeDistribution(dist);

        // 3) Weekly trend (JPQL result -> day labels)
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(6); // 7 points total
        List<DayRateDTO> trend = buildTrend(patientId, start, end);
        dto.setWeeklyCompletionTrend(trend);

        // 4) KEYWORD ALGORITHM (metier avancée part)
        List<String> keywords = extractTopKeywords(taskRepo.taskTexts(patientId), 6);
        dto.setDetectedKeywords(keywords);

        // 5) RISK SCORE (simple explainable algorithm)
        RiskResult risk = computeRisk(dto.getCompletionRate(), missed, dist);
        dto.setRiskLevel(risk.level);
        dto.setRiskReasons(risk.reasons);
        if ("HIGH".equalsIgnoreCase(risk.level)) {
            String reason = "HIGH risk: " + String.join(" ", risk.reasons);
            alertService.createHighRiskIfNeeded(patientId, reason);
        }


        // 6) Suggested notes (generated, not hardcoded in Angular)
        dto.setSuggestedNotes(buildSuggestedNotes(dto, risk));

        return dto;
    }

    private List<DayRateDTO> buildTrend(String patientId, LocalDateTime start, LocalDateTime end) {
        List<Object[]> rows = taskRepo.completionByDay(patientId, start, end);

        // map date->rate
        Map<String, Double> dayToRate = new HashMap<String, Double>();
        for (Object[] r : rows) {
            Object dateObj = r[0];               // date
            long done = ((Number) r[1]).longValue();
            long total = ((Number) r[2]).longValue();
            double rate = (total == 0) ? 0.0 : (done * 100.0 / total);
            dayToRate.put(dateObj.toString(), round1(rate));
        }

        // fill missing days to keep chart stable
        List<DayRateDTO> out = new ArrayList<DayRateDTO>();
        for (int i = 0; i < 7; i++) {
            LocalDateTime d = start.plusDays(i);
            String key = d.toLocalDate().toString();
            double rate = dayToRate.getOrDefault(key, 0.0);
            out.add(new DayRateDTO(shortDayLabel(d.getDayOfWeek().name()), rate));
        }
        return out;
    }

    private String shortDayLabel(String dow) {
        // MONDAY -> Mon
        return dow.substring(0, 1) + dow.substring(1, 3).toLowerCase();
    }

    private double round1(double x) {
        return Math.round(x * 10.0) / 10.0;
    }

    // ---------- Keyword algorithm ----------
    private List<String> extractTopKeywords(List<Object[]> texts, int topK) {
        Map<String, Integer> freq = new HashMap<String, Integer>();

        for (Object[] row : texts) {
            String title = row[0] == null ? "" : row[0].toString();
            String notes = row[1] == null ? "" : row[1].toString();
            List<String> toks = tokenize(title + " " + notes);

            for (String t : toks) {
                if (t.length() < 3) continue;
                if (isStopWord(t)) continue;
                freq.put(t, freq.getOrDefault(t, 0) + 1);
            }
        }

        List<Map.Entry<String, Integer>> list = new ArrayList<Map.Entry<String, Integer>>(freq.entrySet());
        list.sort((a, b) -> b.getValue() - a.getValue());

        List<String> out = new ArrayList<String>();
        for (int i = 0; i < Math.min(topK, list.size()); i++) {
            out.add(list.get(i).getKey());
        }
        return out;
    }

    private List<String> tokenize(String s) {
        String cleaned = s.toLowerCase().replaceAll("[^a-z0-9\\s]", " ");
        String[] parts = cleaned.split("\\s+");
        List<String> out = new ArrayList<String>();
        for (String p : parts) {
            if (!p.isBlank()) out.add(p);
        }
        return out;
    }

    private boolean isStopWord(String w) {
        return Set.of("the","and","for","with","this","that","today","task","note","patient").contains(w);
    }

    // ---------- Risk scoring (explainable) ----------
    private static class RiskResult {
        String level;
        List<String> reasons;
        RiskResult(String level, List<String> reasons) { this.level = level; this.reasons = reasons; }
    }

    private RiskResult computeRisk(double completionRate, long missedHistory, List<TypeCountDTO> dist) {
        int score = 0;
        List<String> reasons = new ArrayList<String>();

        if (completionRate < 40) { score += 4; reasons.add("Low completion rate (< 40%)."); }
        else if (completionRate < 70) { score += 2; reasons.add("Moderate completion rate (< 70%)."); }

        if (missedHistory >= 2) { score += 3; reasons.add("Multiple missed tasks in history."); }
        else if (missedHistory == 1) { score += 1; reasons.add("At least one missed task in history."); }

        // If MEDICATION exists and completion is low, add weight (simple clinical rule)
        boolean hasMedication = dist.stream().anyMatch(d -> "MEDICATION".equals(d.getType()));
        if (hasMedication && completionRate < 70) {
            score += 2;
            reasons.add("Medication tasks require closer adherence monitoring.");
        }

        String level;
        if (score >= 6) level = "HIGH";
        else if (score >= 3) level = "MEDIUM";
        else level = "LOW";

        return new RiskResult(level, reasons);
    }

    private List<String> buildSuggestedNotes(PatientDashboardInsightsDTO dto, RiskResult risk) {
        List<String> notes = new ArrayList<String>();

        if ("HIGH".equals(risk.level)) {
            notes.add("Adherence risk is high: consider adjusting task schedule and increasing reminders.");
        } else if ("MEDIUM".equals(risk.level)) {
            notes.add("Completion is moderate: encourage routine-building and monitor progress.");
        } else {
            notes.add("Good adherence: keep the current routine and reinforce consistency.");
        }

        // most common type
        String common = mostCommonType(dto.getTaskTypeDistribution());
        if (common != null) {
            notes.add("Most frequent task type is " + common + ": focus coaching on this category.");
        }

        if (dto.getDetectedKeywords() != null && !dto.getDetectedKeywords().isEmpty()) {
            notes.add("Recent task keywords: " + String.join(", ", dto.getDetectedKeywords()) + ".");
        }

        return notes;
    }

    private String mostCommonType(List<TypeCountDTO> dist) {
        if (dist == null || dist.isEmpty()) return null;
        TypeCountDTO best = dist.get(0);
        for (TypeCountDTO d : dist) {
            if (d.getCount() > best.getCount()) best = d;
        }
        return best.getType();
    }
}