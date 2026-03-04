package tn.esprit.notification.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String activityId;          // ID of the related activity (String to match existing service)

    @Column(nullable = false)
    private String action;               // CREATED, UPDATED, DELETED

    @Column(columnDefinition = "TEXT")
    private String details;               // Optional details about the change

    @Column(nullable = false)
    private LocalDateTime timestamp;      // When the event occurred

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}