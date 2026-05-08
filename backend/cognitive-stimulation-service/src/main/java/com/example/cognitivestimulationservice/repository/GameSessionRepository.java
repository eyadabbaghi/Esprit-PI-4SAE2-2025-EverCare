package com.example.cognitivestimulationservice.repository;

import com.example.cognitivestimulationservice.entity.CognitiveGameType;
import com.example.cognitivestimulationservice.entity.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface GameSessionRepository extends JpaRepository<GameSession, UUID> {

    List<GameSession> findByMedicalRecordIdOrderByPlayedAtDesc(UUID medicalRecordId);

    List<GameSession> findTop5ByMedicalRecordIdOrderByPlayedAtDesc(UUID medicalRecordId);

    List<GameSession> findTop5ByMedicalRecordIdAndCognitiveGame_GameTypeOrderByPlayedAtDesc(UUID medicalRecordId, CognitiveGameType gameType);

    List<GameSession> findByMedicalRecordIdAndPlayedAtAfterOrderByPlayedAtDesc(UUID medicalRecordId, LocalDateTime playedAtAfter);
}
