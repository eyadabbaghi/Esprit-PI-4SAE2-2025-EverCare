package com.yourteam.communicationservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "calls")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Call {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    @JsonIgnore
    private Conversation conversation;

    @Column(nullable = false)
    private String callerId; // ID de celui qui lance l'appel

    @Enumerated(EnumType.STRING)
    private CallStatus status; // INITIATED, ONGOING, COMPLETED, MISSED

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long durationInSeconds; // Calculé à la fin de l'appel

    @PrePersist
    protected void onCreate() {
        this.startTime = LocalDateTime.now();
        this.status = CallStatus.INITIATED;
    }
    @Transient // Ne sera pas enregistré en base de données
    public String getReadableDuration() {
        if (durationInSeconds == null) return "00:00";

        long hours = durationInSeconds / 3600;
        long minutes = (durationInSeconds % 3600) / 60;
        long seconds = durationInSeconds % 60;

        if (hours > 0) {
            return String.format("%02d:%02d:%02d", hours, minutes, seconds);
        } else {
            return String.format("%02d:%02d", minutes, seconds);
        }
    }
}
