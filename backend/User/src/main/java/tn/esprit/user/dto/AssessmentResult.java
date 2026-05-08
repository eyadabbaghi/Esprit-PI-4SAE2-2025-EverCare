package tn.esprit.user.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class AssessmentResult {
    private String userId;
    private LocalDateTime completedAt;

    // Step 1: Cluster
    private ClusterInfo cluster;

    // Step 2: Diagnosis
    private DiagnosisInfo diagnosis;

    // Step 3a (if sick): Severity
    private SeverityInfo severity;

    // Step 3b (if healthy): Risk
    private RiskInfo riskAssessment;

    // Step 4: Recommendations
    private RecommendationInfo recommendations;

    // Raw ML response stored for audit
    private Map<String, Object> rawMlResponse;

    @Data
    public static class ClusterInfo {
        private Integer id;
        private String label;
        private Double diagnosisRateInCluster;
    }

    @Data
    public static class DiagnosisInfo {
        private Integer predicted;       // 0 or 1
        private Double probability;
        private String label;
    }

    @Data
    public static class SeverityInfo {
        private Double mmseEstimate;
        private String stage;
        private String severityLevel;    // mild / moderate / severe
        private String mmseRange;
    }

    @Data
    public static class RiskInfo {
        private Integer score;           // 0-100
        private String level;            // Low / Moderate / High
        private List<String> riskFactors;
    }

    @Data
    public static class RecommendationInfo {
        private String path;             // treatment / preventive
        private String title;
        private String description;
        private List<String> medications;
        private List<String> lifestyle;
        private List<String> monitoring;
        private List<String> support;
        private List<String> actions;
    }
}

