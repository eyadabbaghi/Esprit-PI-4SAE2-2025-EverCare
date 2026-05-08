package com.example.medicalrecordservice.repository;

import com.example.medicalrecordservice.entity.AlertStatus;
import com.example.medicalrecordservice.entity.ClinicalAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClinicalAlertRepository extends JpaRepository<ClinicalAlert, UUID> {

    Page<ClinicalAlert> findByActiveTrue(Pageable pageable);

    Page<ClinicalAlert> findByActiveTrueAndStatus(AlertStatus status, Pageable pageable);

    Optional<ClinicalAlert> findTopByAssessmentReport_IdAndActiveTrueOrderByCreatedAtDesc(UUID assessmentReportId);
}
