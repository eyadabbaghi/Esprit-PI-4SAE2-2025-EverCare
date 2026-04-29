package com.example.cognitivestimulationservice.repository;

import com.example.cognitivestimulationservice.entity.CognitiveGame;
import com.example.cognitivestimulationservice.entity.CognitiveGameType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CognitiveGameRepository extends JpaRepository<CognitiveGame, UUID> {

    List<CognitiveGame> findByActiveTrueOrderByDifficultyLevelAscTitleAsc();

    boolean existsByTitleIgnoreCase(String title);

    List<CognitiveGame> findByActiveTrueAndDifficultyLevelBetweenOrderByDifficultyLevelAscTitleAsc(int minDifficulty, int maxDifficulty);

    List<CognitiveGame> findByActiveTrueAndGameTypeAndDifficultyLevelBetweenOrderByDifficultyLevelAscTitleAsc(
            CognitiveGameType gameType,
            int minDifficulty,
            int maxDifficulty
    );
}
