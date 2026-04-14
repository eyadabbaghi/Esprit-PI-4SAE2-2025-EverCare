package com.example.medicalrecordservice.repository;

import com.example.medicalrecordservice.entity.MedicalHistory;
import com.example.medicalrecordservice.entity.MedicalHistoryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicalHistoryRepository extends JpaRepository<MedicalHistory, UUID> {
    List<MedicalHistory> findByMedicalRecordIdOrderByDateDesc(UUID medicalRecordId);

    Optional<MedicalHistory> findByIdAndMedicalRecordId(UUID id, UUID medicalRecordId);

    boolean existsByMedicalRecordIdAndTypeAndDateAndDescription(UUID medicalRecordId, MedicalHistoryType type, LocalDate date, String description);

    long countByMedicalRecordIdAndDate(UUID medicalRecordId, LocalDate date);

    long countByMedicalRecordIdAndDateAndType(UUID medicalRecordId, LocalDate date, MedicalHistoryType type);
}
