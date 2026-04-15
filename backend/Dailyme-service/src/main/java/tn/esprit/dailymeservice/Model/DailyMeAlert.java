package tn.esprit.dailymeservice.Model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dailyme_alerts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class DailyMeAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String patientId;

    @Column(nullable = false)
    private String riskLevel; // HIGH / MEDIUM / LOW

    @Column(nullable = false)
    private String status; // NEW / SEEN / RESOLVED

    @Column(length = 600)
    private String reason; // short message

    @Column(nullable = false)
    private String source; // e.g. "DAILYME_INSIGHTS"

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime resolvedAt;
}