package tn.esprit.user.service;



import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tn.esprit.user.dto.AssessmentRequest;
import tn.esprit.user.dto.AssessmentResult;
import tn.esprit.user.entity.User;
import tn.esprit.user.repository.AssessmentResultRepository;
import tn.esprit.user.entity.AssessmentEntity;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final RestTemplate restTemplate;
    private final AssessmentResultRepository assessmentResultRepository;
    private final ObjectMapper objectMapper;

    @Value("${ml.service.url:http://localhost:5001}")
    private String mlServiceUrl;

    /**
     * Run assessment: call Python ML API and persist result.
     */
    public AssessmentResult runAssessment(User user, AssessmentRequest request) {
        // Call Python Flask ML service
        String url = mlServiceUrl + "/api/assess/predict";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<AssessmentRequest> entity = new HttpEntity<>(request, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        Map<String, Object> mlResult = response.getBody();

        // Map response to DTO
        AssessmentResult result = mapToResult(user.getUserId(), mlResult);
        result.setRawMlResponse(mlResult);

        // Persist to DB
        saveAssessment(user.getUserId(), result);

        return result;
    }

    /**
     * Get latest assessment for a user.
     */
    public AssessmentResult getLatestAssessment(String userId) {
        return assessmentResultRepository
                .findTopByUserIdOrderByCompletedAtDesc(userId)
                .map(entity -> {
                    try {
                        return objectMapper.readValue(entity.getResultJson(), AssessmentResult.class);
                    } catch (Exception e) {
                        return null;
                    }
                })
                .orElse(null);
    }

    private AssessmentResult mapToResult(String userId, Map<String, Object> ml) {
        AssessmentResult result = new AssessmentResult();
        result.setUserId(userId);
        result.setCompletedAt(LocalDateTime.now());

        // Cluster
        if (ml.containsKey("cluster")) {
            Map<String, Object> c = (Map<String, Object>) ml.get("cluster");
            AssessmentResult.ClusterInfo ci = new AssessmentResult.ClusterInfo();
            ci.setId((Integer) c.get("id"));
            ci.setLabel((String) c.get("label"));
            ci.setDiagnosisRateInCluster(((Number) c.get("diagnosisRateInCluster")).doubleValue());
            result.setCluster(ci);
        }

        // Diagnosis
        if (ml.containsKey("diagnosis")) {
            Map<String, Object> d = (Map<String, Object>) ml.get("diagnosis");
            AssessmentResult.DiagnosisInfo di = new AssessmentResult.DiagnosisInfo();
            di.setPredicted((Integer) d.get("predicted"));
            di.setProbability(((Number) d.get("probability")).doubleValue());
            di.setLabel((String) d.get("label"));
            result.setDiagnosis(di);
        }

        // Severity (sick path)
        if (ml.containsKey("severity")) {
            Map<String, Object> s = (Map<String, Object>) ml.get("severity");
            AssessmentResult.SeverityInfo si = new AssessmentResult.SeverityInfo();
            si.setMmseEstimate(((Number) s.get("mmseEstimate")).doubleValue());
            si.setStage((String) s.get("stage"));
            si.setSeverityLevel((String) s.get("severityLevel"));
            si.setMmseRange((String) s.get("mmseRange"));
            result.setSeverity(si);
        }

        // Risk (healthy path)
        if (ml.containsKey("riskAssessment")) {
            Map<String, Object> r = (Map<String, Object>) ml.get("riskAssessment");
            AssessmentResult.RiskInfo ri = new AssessmentResult.RiskInfo();
            ri.setScore((Integer) r.get("score"));
            ri.setLevel((String) r.get("level"));
            ri.setRiskFactors((java.util.List<String>) r.get("riskFactors"));
            result.setRiskAssessment(ri);
        }

        // Recommendations
        if (ml.containsKey("recommendations")) {
            Map<String, Object> rec = (Map<String, Object>) ml.get("recommendations");
            AssessmentResult.RecommendationInfo ri = new AssessmentResult.RecommendationInfo();
            ri.setPath((String) rec.get("path"));
            ri.setTitle((String) rec.get("title"));
            ri.setDescription((String) rec.getOrDefault("description", null));
            ri.setMedications((java.util.List<String>) rec.getOrDefault("medications", null));
            ri.setLifestyle((java.util.List<String>) rec.getOrDefault("lifestyle", null));
            ri.setMonitoring((java.util.List<String>) rec.getOrDefault("monitoring", null));
            ri.setSupport((java.util.List<String>) rec.getOrDefault("support", null));
            ri.setActions((java.util.List<String>) rec.getOrDefault("actions", null));
            result.setRecommendations(ri);
        }

        return result;
    }

    private void saveAssessment(String userId, AssessmentResult result) {
        try {
            AssessmentEntity entity = new AssessmentEntity();
            entity.setUserId(userId);
            entity.setCompletedAt(result.getCompletedAt());
            entity.setDiagnosisPredicted(result.getDiagnosis().getPredicted());
            entity.setDiagnosisProbability(result.getDiagnosis().getProbability());
            entity.setClusterLabel(result.getCluster() != null ? result.getCluster().getLabel() : null);
            entity.setSeverityLevel(result.getSeverity() != null ? result.getSeverity().getSeverityLevel() : null);
            entity.setRiskLevel(result.getRiskAssessment() != null ? result.getRiskAssessment().getLevel() : null);
            entity.setRiskScore(result.getRiskAssessment() != null ? result.getRiskAssessment().getScore() : null);
            entity.setResultJson(objectMapper.writeValueAsString(result));
            assessmentResultRepository.save(entity);
        } catch (Exception e) {
            // Log but don't fail
            System.err.println("Failed to save assessment: " + e.getMessage());
        }
    }
}
