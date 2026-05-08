package com.example.cognitivestimulationservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "game_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID medicalRecordId;

    @Column(nullable = false, length = 100)
    private String patientId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cognitive_game_id", nullable = false)
    private CognitiveGame cognitiveGame;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlzheimerStage stageAtPlay;

    @Column(nullable = false)
    private LocalDateTime playedAt;

    @Column(length = 2000)
    private String playerAnswer;

    @Builder.Default
    @Column(nullable = false)
    private boolean correct = false;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private int difficultyAtPlay;

    @Builder.Default
    @Column(nullable = false)
    private boolean assistanceNeeded = false;

    @Column(nullable = false)
    private int frustrationLevel;

    @Column(nullable = false)
    private int enjoymentLevel;

    @Builder.Default
    @Column(nullable = false)
    private boolean abandoned = false;

    @Column(length = 2000)
    private String notes;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
