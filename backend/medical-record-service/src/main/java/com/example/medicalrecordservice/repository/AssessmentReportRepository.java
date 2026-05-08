package com.example.medicalrecordservice.repository;

import com.example.medicalrecordservice.entity.AssessmentReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentReportRepository extends JpaRepository<AssessmentReport, UUID>, JpaSpecificationExecutor<AssessmentReport> {

    List<AssessmentReport> findByPatientIdAndActiveTrueOrderByCreatedAtDesc(String patientId);

    Page<AssessmentReport> findByNeedsAttentionTrueAndActiveTrue(Pageable pageable);

    Optional<AssessmentReport> findTopByPatientIdAndActiveTrueOrderByCreatedAtDesc(String patientId);

    boolean existsByPatientIdAndNeedsAttentionTrueAndActiveTrue(String patientId);
}
