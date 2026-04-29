package com.example.medicalrecordservice.repository;

import com.example.medicalrecordservice.entity.MedicalDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicalDocumentRepository extends JpaRepository<MedicalDocument, UUID> {
    List<MedicalDocument> findByMedicalRecordId(UUID medicalRecordId);

    Optional<MedicalDocument> findByIdAndMedicalRecordId(UUID id, UUID medicalRecordId);

    boolean existsByMedicalRecordIdAndFileNameIgnoreCase(UUID medicalRecordId, String fileName);

    long countByMedicalRecordId(UUID medicalRecordId);
}
