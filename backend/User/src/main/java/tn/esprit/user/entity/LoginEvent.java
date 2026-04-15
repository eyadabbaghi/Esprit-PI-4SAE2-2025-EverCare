package tn.esprit.user.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String userId;
    private String email;

    @Enumerated(EnumType.STRING)
    private LoginType loginType; // FACE, PASSWORD

    private LocalDateTime loginAt;

    private String ipAddress; // optional
}