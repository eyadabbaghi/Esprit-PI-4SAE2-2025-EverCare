package com.example.cognitivestimulationservice.repository;

import com.example.cognitivestimulationservice.entity.CognitiveAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CognitiveAlertRepository extends JpaRepository<CognitiveAlert, UUID> {

    List<CognitiveAlert> findByMedicalRecordIdOrderByCreatedAtDesc(UUID medicalRecordId);

    List<CognitiveAlert> findByStatusAndActiveOrderByCreatedAtDesc(com.example.cognitivestimulationservice.entity.CognitiveAlertStatus status, boolean active);
}

