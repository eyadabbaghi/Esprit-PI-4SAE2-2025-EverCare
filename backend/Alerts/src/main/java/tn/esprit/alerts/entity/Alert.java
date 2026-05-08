package tn.esprit.alerts.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "alerts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Alert {

    @Id
    @Column(name = "alert_id")
    private String alertId;

    @PrePersist
    public void generateId() {
        if (alertId == null) {
            alertId = UUID.randomUUID().toString();
        }
    }

    @ManyToOne
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @Column(nullable = false)
    private String senderId;

    @Column(nullable = false)
    private String targetId;

    @Enumerated(EnumType.STRING)
    private AlertStatus status;

    private LocalDateTime sentAt;
    private LocalDateTime acknowledgedAt;

    // New fields for scheduling
    private String label;                           // optional title for the alert

    private LocalTime scheduledTime;                // time of day, e.g., 14:30

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "alert_repeat_days", joinColumns = @JoinColumn(name = "alert_id"))
    @Column(name = "day")
    private Set<String> repeatDays = new HashSet<>(); // e.g., "MON", "TUE", ...
}