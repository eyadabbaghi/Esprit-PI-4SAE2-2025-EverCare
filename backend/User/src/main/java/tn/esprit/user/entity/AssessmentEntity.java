package tn.esprit.user.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "assessment_results")
@Data
public class AssessmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private LocalDateTime completedAt;

    private Integer diagnosisPredicted;
    private Double diagnosisProbability;
    private String clusterLabel;
    private String severityLevel;
    private String riskLevel;
    private Integer riskScore;

    @Column(columnDefinition = "TEXT")
    private String resultJson;   // full JSON for retrieval
}