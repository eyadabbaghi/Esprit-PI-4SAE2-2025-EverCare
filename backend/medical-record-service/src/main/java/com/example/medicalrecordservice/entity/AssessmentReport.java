package com.example.medicalrecordservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "assessment_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String patientId;

    @Column(length = 255)
    private String patientName;

    @Column(length = 255)
    private String caregiverName;

    @Lob
    @Column(nullable = false)
    private String answersJson;

    @Column(nullable = false)
    private int score;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlzheimerStage computedStage;

    @Column(nullable = false, length = 2000)
    private String recommendation;

    @Column(length = 2000)
    private String doctorNote;

    @Builder.Default
    @Column(nullable = false)
    private boolean needsAttention = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    // The live table still has a required archived column. Keep both flags in sync
    // so legacy rows remain readable and new inserts do not fail.
    @Builder.Default
    @Column(nullable = false)
    private boolean archived = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PostLoad
    void syncActiveFromArchived() {
        // Legacy rows still persist archived, while the application now reads active.
        this.active = !this.archived;
    }

    @PrePersist
    @PreUpdate
    void syncArchivedFromActive() {
        // Keep inserts and updates compatible with the existing table schema.
        this.archived = !this.active;
    }
}
