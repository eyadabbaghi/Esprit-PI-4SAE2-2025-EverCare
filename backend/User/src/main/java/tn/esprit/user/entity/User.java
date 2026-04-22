package tn.esprit.user.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;      // added
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "user_id")
    private String userId;

    @PrePersist
    public void generateId() {
        if (this.userId == null) {
            this.userId = UUID.randomUUID().toString();
        }
        this.createdAt = LocalDateTime.now();
    }

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private String phone;

    private boolean isVerified;

    private LocalDateTime createdAt;

    // New fields
    private LocalDate dateOfBirth;          // date of birth
    private String emergencyContact;         // emergency contact info
    private String profilePicture;           // URL or path to profile picture
}