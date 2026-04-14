package com.example.cognitivestimulationservice.dto;

import com.example.cognitivestimulationservice.entity.AlzheimerStage;
import com.example.cognitivestimulationservice.entity.CognitiveGameType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CognitiveProgressResponse {

    private UUID medicalRecordId;
    private String patientId;
    private AlzheimerStage alzheimerStage;
    private int totalSessions;
    private double averageScoreLast7Days;
    private double averageScoreLast30Days;
    private Integer recommendedDifficulty;
    private CognitiveGameType recommendedGameType;
    private boolean declineDetected;
    private boolean easierGameSuggested;
    private String recommendation;
}
