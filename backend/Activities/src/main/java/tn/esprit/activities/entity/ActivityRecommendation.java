package tn.esprit.activities.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_recommendations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivityRecommendation {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String doctorId;
    private String patientId;
    @ManyToOne
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;
    private LocalDateTime recommendedAt;
}