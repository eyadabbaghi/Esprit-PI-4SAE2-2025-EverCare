package tn.esprit.alerts.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "incidents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Incident {

    @Id
    @Column(name = "incident_id")
    private String incidentId;

    @PrePersist
    public void generateId() {
        if (incidentId == null) {
            incidentId = UUID.randomUUID().toString();
        }
        incidentDate = LocalDateTime.now();
    }

    @Column(nullable = false)
    private String title;                 // new field

    @Column(nullable = false)
    private String type;                   // user-defined, not enum

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Severity severity;              // LOW, MEDIUM, HIGH

    @Enumerated(EnumType.STRING)
    private IncidentStatus status;          // OPEN, RESOLVED

    @Column(nullable = false)
    private LocalDateTime incidentDate;

    @Column(nullable = false)
    private String reportedByUserId;        // string ID, no @ManyToOne

    private String location;                // new field (optional)

    @Column(nullable = false)
    private String patientId;

    // One Incident -> many Alerts
    @OneToMany(mappedBy = "incident", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Alert> alerts = new ArrayList<>();

    // helper
    public void addAlert(Alert alert) {
        alerts.add(alert);
        alert.setIncident(this);
    }
}