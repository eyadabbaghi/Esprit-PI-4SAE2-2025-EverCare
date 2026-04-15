package com.example.medicalrecordservice.entity;

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
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clinical_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicalAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_report_id", nullable = false)
    private AssessmentReport assessmentReport;

    @Column(nullable = false, length = 100)
    private String patientId;

    @Column(length = 255)
    private String patientName;

    @Column(nullable = false)
    private int scoreAtTrigger;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlzheimerStage stageAtTrigger;

    @Column(nullable = false, length = 2000)
    private String reason;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertStatus status = AlertStatus.OPEN;

    @Column
    private LocalDateTime acknowledgedAt;

    @Column
    private LocalDateTime resolvedAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    // The live table still has a required archived column. Keep both flags in sync
    // so alerts created from assessments remain compatible with existing schema.
    @Builder.Default
    @Column(nullable = false)
    private boolean archived = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

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

