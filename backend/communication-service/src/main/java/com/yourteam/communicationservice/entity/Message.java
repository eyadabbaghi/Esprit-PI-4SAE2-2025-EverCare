package com.yourteam.communicationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String senderId;

    @Column(columnDefinition = "TEXT")
    private String content;

    private LocalDateTime sentAt;

    private boolean isRead;

    // --- NOUVEAUX CHAMPS POUR LES FICHIERS ---
    private String fileUrl;  // Stocke le nom du fichier ou le chemin
    private String fileType; // image/png, application/pdf, etc.

    @ManyToOne
    @JoinColumn(name = "conversation_id")
    @JsonBackReference // <--- Jackson va s'arrêter ici pour ne pas remonter à la conversation
    private Conversation conversation;

    @PrePersist
    protected void onCreate() {
        this.sentAt = LocalDateTime.now();
        this.isRead = false;
    }
}