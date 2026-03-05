package everCare.appointments.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "consultation_rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsultationRoom {

    @Id
    @Column(name = "room_id")
    private String roomId;

    @PrePersist
    public void generateId() {
        if (this.roomId == null) {
            this.roomId = UUID.randomUUID().toString();
        }
        this.createdAt = LocalDateTime.now();
        this.expiresAt = LocalDateTime.now().plusHours(2);
    }

    @OneToOne
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @Column(nullable = false)
    private String doctorId;

    @Column(nullable = false)
    private String patientId;

    private String caregiverId;

    @ElementCollection
    @CollectionTable(name = "room_participants",
            joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "participant_id")
    private Set<String> participants = new HashSet<>();

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private boolean isActive;

    public boolean canJoin(String userId) {
        return userId.equals(doctorId) || userId.equals(patientId) ||
                (caregiverId != null && userId.equals(caregiverId));
    }

    public void addParticipant(String userId) {
        participants.add(userId);
    }

    public void removeParticipant(String userId) {
        participants.remove(userId);
    }
}