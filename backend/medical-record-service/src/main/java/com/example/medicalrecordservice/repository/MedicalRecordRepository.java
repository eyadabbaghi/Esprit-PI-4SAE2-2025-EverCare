package com.example.medicalrecordservice.repository;

import com.example.medicalrecordservice.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {
    Optional<MedicalRecord> findByPatientId(String patientId);

    boolean existsByPatientId(String patientId);

    Page<MedicalRecord> findByActive(boolean active, Pageable pageable);
}
