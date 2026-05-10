package tn.esprit.alerts.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "doctor_recommendations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorRecommendation {

    @Id
    @Column(name = "recommendation_id")
    private String recommendationId;

    @PrePersist
    public void beforeCreate() {
        if (recommendationId == null) {
            recommendationId = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    @JsonIgnore
    private Incident incident;

    @Column(nullable = false)
    private String doctorId;

    @Column(nullable = false)
    private String doctorName;

    @Column(nullable = false, length = 2000)
    private String recommendation;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
