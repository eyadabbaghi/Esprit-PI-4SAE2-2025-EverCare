package com.yourteam.communicationservice.entity;



import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "conversations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // On stocke les IDs des utilisateurs du User-service
    @Column(nullable = false)
    private String user1Id;

    @Column(nullable = false)
    private String user2Id;

    private LocalDateTime createdAt;

    private boolean isActive;

    // Dans ta classe Conversation
    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL)
    @JsonManagedReference // <--- Jackson va suivre ce lien
    private List<Message> messages;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.isActive = true; // Active par défaut à la création
    }
}